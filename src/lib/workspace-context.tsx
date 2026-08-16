"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, type ReactNode,
} from "react";
import { type PlanId, type Plan, PLANS, getPlan } from "@/lib/plans";

// ── Page type (real DB page, derived display fields) ──────────────────────────

export type WorkspacePage = {
  id: string;
  name: string;
  color: string;
  avatar: string;
};

const PAGE_COLORS = ["#6C63FF", "#22D3EE", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#F97316"];

export function derivedPageColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  return PAGE_COLORS[Math.abs(h) % PAGE_COLORS.length];
}

export function derivedPageAvatar(name: string): string {
  return name.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "??";
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreditActivity = {
  id: string;
  date: string;
  operation: string;
  amount: number;    // negative = used, positive = top-up / allocation
  balance: number;
  pageId?: string;
  pageName?: string;
};

export type WorkspaceState = {
  planId: string;
  monthlyAllocation: number;
  creditsUsed: number;
  bonusCredits: number;
  unlimitedCredits: boolean;
  renewalDate: string;
  connectedPageIds: string[];
  pages: WorkspacePage[];
  teamMemberCount: number;
  creditActivity: CreditActivity[];
  userName: string | null;
};

type WorkspaceCtx = WorkspaceState & {
  plan: Plan;
  creditsRemaining: number;
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  consumeCredits: (amount: number, operation: string, pageId?: string) => boolean;
  addCredits: (amount: number, source?: string) => void;
  upgradePlan: (planId: PlanId) => void;
  connectPage: (pageId: string) => boolean;
  disconnectPage: (pageId: string) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function safePlan(id: string): Plan {
  return PLANS[id as PlanId] ?? PLANS["lite"];
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Props from server ─────────────────────────────────────────────────────────

export type WorkspaceInitialLedger = {
  monthlyAllocation: number;
  bonusCredits: number;
  usedThisPeriod: number;
  periodEnd: Date | string | null;
  unlimitedCredits: boolean;
};

type ProviderProps = {
  children: ReactNode;
  initialPlanId?: string;
  initialLedger?: WorkspaceInitialLedger | null;
  initialUserName?: string | null;
};

// ── Context ───────────────────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({
  children,
  initialPlanId = "lite",
  initialLedger = null,
  initialUserName = null,
}: ProviderProps) {
  const [state, setState] = useState<WorkspaceState>(() => ({
    planId: initialPlanId,
    monthlyAllocation: initialLedger?.monthlyAllocation ?? 30_000,
    creditsUsed: initialLedger?.usedThisPeriod ?? 0,
    bonusCredits: initialLedger?.bonusCredits ?? 0,
    unlimitedCredits: initialLedger?.unlimitedCredits ?? false,
    renewalDate: formatDate(initialLedger?.periodEnd),
    connectedPageIds: [],
    pages: [],
    teamMemberCount: 1,
    creditActivity: [],
    userName: initialUserName,
  }));

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  // Sync credit data from /api/credits on mount (keeps state fresh)
  useEffect(() => {
    fetch("/api/credits")
      .then(r => r.ok ? r.json() : null)
      .then((data: { ledger?: WorkspaceInitialLedger & { usedThisPeriod: number }; recentTransactions?: unknown[] } | null) => {
        if (!data?.ledger) return;
        const l = data.ledger;
        setState(prev => ({
          ...prev,
          monthlyAllocation: l.monthlyAllocation,
          bonusCredits: l.bonusCredits,
          creditsUsed: l.usedThisPeriod,
          unlimitedCredits: l.unlimitedCredits,
          renewalDate: formatDate(l.periodEnd),
        }));
      })
      .catch(() => {});
  }, []);

  // Fetch credit transaction history
  useEffect(() => {
    fetch("/api/credits/transactions?limit=10")
      .then(r => r.ok ? r.json() : null)
      .then((data: { transactions?: Array<{ id: string; type: string; operation: string; amount: number; balanceAfter: number; createdAt: string }> } | null) => {
        if (!data?.transactions?.length) return;
        const activity: CreditActivity[] = data.transactions.map(t => ({
          id: t.id,
          date: formatDate(t.createdAt),
          operation: t.operation,
          amount: t.type === "CREDIT" ? t.amount : -t.amount,
          balance: t.balanceAfter,
        }));
        setState(prev => ({ ...prev, creditActivity: activity }));
      })
      .catch(() => {});
  }, []);

  // Fetch connected Facebook pages
  useEffect(() => {
    fetch("/api/pages")
      .then(r => r.ok ? r.json() : null)
      .then((data: { pages?: Array<{ id: string; name: string; pageId: string }> } | null) => {
        if (!data?.pages) return;
        const pages: WorkspacePage[] = data.pages.map(p => ({
          id: p.id,
          name: p.name,
          color: derivedPageColor(p.name),
          avatar: derivedPageAvatar(p.name),
        }));
        setState(prev => ({
          ...prev,
          pages,
          connectedPageIds: pages.map(p => p.id),
        }));
      })
      .catch(() => {});
  }, []);

  const plan = safePlan(state.planId);

  const creditsRemaining = state.unlimitedCredits
    ? 999_999_999
    : state.monthlyAllocation + state.bonusCredits - state.creditsUsed;

  const consumeCredits = useCallback((amount: number, operation: string, pageId?: string): boolean => {
    if (amount <= 0) return true;
    let success = false;
    setState(prev => {
      if (!prev.unlimitedCredits) {
        const remaining = prev.monthlyAllocation + prev.bonusCredits - prev.creditsUsed;
        if (remaining < amount) return prev;
      }
      const newUsed = prev.unlimitedCredits ? prev.creditsUsed : prev.creditsUsed + amount;
      const newBalance = prev.unlimitedCredits
        ? prev.monthlyAllocation
        : prev.monthlyAllocation + prev.bonusCredits - newUsed;
      const page = prev.pages.find(p => p.id === pageId);
      const activity: CreditActivity = {
        id: `ca_${Date.now()}`,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        operation,
        amount: -amount,
        balance: newBalance,
        pageId,
        pageName: page?.name,
      };
      success = true;
      return { ...prev, creditsUsed: newUsed, creditActivity: [activity, ...prev.creditActivity] };
    });
    return success;
  }, []);

  const addCredits = useCallback((amount: number, source?: string) => {
    setState(prev => {
      const newBonus = prev.bonusCredits + amount;
      const newBalance = prev.monthlyAllocation + newBonus - prev.creditsUsed;
      const activity: CreditActivity = {
        id: `ca_${Date.now()}`,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        operation: source ?? "Credit Purchase",
        amount,
        balance: newBalance,
      };
      return { ...prev, bonusCredits: newBonus, creditActivity: [activity, ...prev.creditActivity] };
    });
  }, []);

  const upgradePlan = useCallback((planId: PlanId) => {
    setState(prev => ({ ...prev, planId, creditsUsed: 0, bonusCredits: 0 }));
  }, []);

  const connectPage = useCallback((pageId: string): boolean => {
    let allowed = false;
    setState(prev => {
      const p = safePlan(prev.planId);
      if (prev.connectedPageIds.includes(pageId)) return prev;
      if (p.pageLimit < 9999 && prev.connectedPageIds.length >= p.pageLimit) return prev;
      allowed = true;
      return { ...prev, connectedPageIds: [...prev.connectedPageIds, pageId] };
    });
    return allowed;
  }, []);

  const disconnectPage = useCallback((pageId: string) => {
    setState(prev => ({
      ...prev,
      connectedPageIds: prev.connectedPageIds.filter(id => id !== pageId),
      pages: prev.pages.filter(p => p.id !== pageId),
    }));
    if (selectedPageId === pageId) setSelectedPageId(null);
  }, [selectedPageId]);

  return (
    <WorkspaceContext.Provider value={{
      ...state,
      plan,
      creditsRemaining,
      selectedPageId,
      setSelectedPageId,
      consumeCredits,
      addCredits,
      upgradePlan,
      connectPage,
      disconnectPage,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

// Keep getPlan export for backward-compat with billing page
export { getPlan };
