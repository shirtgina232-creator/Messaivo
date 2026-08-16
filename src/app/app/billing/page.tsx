"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check, X, Minus, CreditCard, ArrowRight, Zap, Users, Link2,
  Clock, History, ShieldCheck, Sparkles,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import {
  PLANS, BILLING_PERIODS, getPeriodPrice, getPeriodTotal,
  type Plan, type PlanId, type BillingPeriod, formatLimit,
} from "@/lib/plans";
import { CheckoutModal, type CheckoutOrder } from "@/components/app/CheckoutModal";

// ── DB plan shape (from /api/public/plans) ────────────────────────────────────

type DbPlan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number | null;
  monthlyCredits: number;
  features: string[];
  isRecommended: boolean;
  displayOrder: number;
  premiumInbox: boolean;
};

// Merge DB plan data with the local frontend Plan definition (for UI fields).
function mergePlan(db: DbPlan): Plan | null {
  const local = PLANS[db.slug as PlanId];
  if (!local) return null;
  return {
    ...local,
    name: db.name,
    description: db.description,
    monthlyPrice: db.monthlyPrice,
    monthlyCredits: db.monthlyCredits,
    recommended: db.isRecommended,
    premiumInbox: db.premiumInbox,
    costPerThousand:
      db.monthlyPrice > 0
        ? Math.round((db.monthlyPrice / db.monthlyCredits) * 1_000_000) / 1000
        : 0,
  };
}

// ── Feature row definitions ───────────────────────────────────────────────────

type FeatureValue = boolean | "limited" | "basic" | "dedicated" | string;

type FeatureRow = { label: string; getValue: (p: Plan) => FeatureValue };

const FEATURES: FeatureRow[] = [
  { label: "Monthly credits",          getValue: p => p.monthlyCredits.toLocaleString() },
  { label: "Cost per 1,000 messages",  getValue: p => `$${p.costPerThousand.toFixed(3)}` },
  { label: "Facebook Pages",           getValue: p => formatLimit(p.pageLimit) },
  { label: "Audience storage",         getValue: p => formatLimit(p.audienceStorage) + " contacts" },
  { label: "Team members",             getValue: p => formatLimit(p.teamMemberLimit) },
  { label: "Premium Inbox",            getValue: p => p.premiumInbox },
  { label: "Bulk messaging",           getValue: p => p.bulkMessaging },
  { label: "Advanced filters",         getValue: p => p.advancedFilters },
  { label: "Personalized messages",    getValue: p => p.personalizedMessages },
  { label: "Scheduled broadcasts",     getValue: p => p.scheduledBroadcasts },
  { label: "Live delivery & tracking", getValue: p => p.liveDeliveryTracking },
  { label: "AI message optimization",  getValue: p => p.aiOptimization },
  { label: "Priority support",         getValue: p => p.prioritySupport },
];

// ── Feature value renderer ────────────────────────────────────────────────────

function FeatureCell({ value, color }: { value: FeatureValue; color: string }) {
  if (value === true) return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center mx-auto" style={{ background: `${color}20` }}>
      <Check size={11} style={{ color }} strokeWidth={2.5} />
    </div>
  );
  if (value === false) return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(255,255,255,0.04)" }}>
      <X size={10} style={{ color: "#8B95A7", opacity: 0.5 }} />
    </div>
  );
  if (value === "limited")   return <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)",  color: "#F59E0B" }}>Limited</span>;
  if (value === "basic")     return <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(34,211,238,0.12)",  color: "#22D3EE" }}>Basic</span>;
  if (value === "dedicated") return <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>Dedicated</span>;
  return <span className="text-[11.5px] font-medium text-center block" style={{ color: "#F5F7FA" }}>{value as string}</span>;
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, period, isCurrent, onSelect }: {
  plan: Plan; period: BillingPeriod; isCurrent: boolean; onSelect: () => void;
}) {
  const monthlyRate = getPeriodPrice(plan, period);
  const total = getPeriodTotal(plan, period);
  const bp = BILLING_PERIODS.find(b => b.id === period)!;
  const savingsAmt = period !== "monthly" ? Math.round((plan.monthlyPrice - monthlyRate) * bp.months * 100) / 100 : 0;

  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden transition-all"
      style={{
        background: plan.recommended ? `linear-gradient(160deg, ${plan.color}12, ${plan.color}06)` : "#101722",
        border: `1px solid ${plan.recommended ? `${plan.color}35` : isCurrent ? `${plan.color}25` : "rgba(255,255,255,0.08)"}`,
        boxShadow: plan.recommended ? `0 0 40px ${plan.color}15` : "none",
      }}
    >
      {plan.recommended && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold tracking-wide" style={{ background: plan.color, color: "#fff" }}>
          <Sparkles size={11} /> RECOMMENDED
        </div>
      )}

      {isCurrent && !plan.recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-3 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap" style={{ background: "#10B981", color: "#fff" }}>
          <Check size={9} /> Current Plan
        </div>
      )}
      {isCurrent && plan.recommended && (
        <div className="absolute right-3 top-3 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "#10B981", color: "#fff" }}>
          <Check size={9} /> Current
        </div>
      )}

      <div className="flex flex-col p-5 flex-1 gap-0">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${plan.color}20` }}>
              <span className="text-[10px] font-bold" style={{ color: plan.color }}>{plan.name[0]}</span>
            </div>
            <h3 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{plan.name}</h3>
          </div>
          <p className="text-[11.5px] leading-relaxed" style={{ color: "#8B95A7" }}>{plan.description}</p>
        </div>

        <div className="mb-5">
          <div className="flex items-end gap-1 mb-0.5">
            <span className="text-[32px] font-bold leading-none" style={{ color: "#F5F7FA" }}>${monthlyRate.toFixed(0)}</span>
            <span className="text-[13px] mb-1" style={{ color: "#8B95A7" }}>/mo</span>
          </div>
          {period !== "monthly" ? (
            <div className="text-[11px]" style={{ color: "#8B95A7" }}>
              ${total.toFixed(2)} billed {period === "quarterly" ? "quarterly" : "every 6 months"}
              {savingsAmt > 0 && <span className="ml-1.5 font-semibold" style={{ color: "#10B981" }}>· Save ${savingsAmt.toFixed(2)}</span>}
            </div>
          ) : (
            <div className="text-[11px]" style={{ color: "#8B95A7" }}>Billed monthly</div>
          )}
        </div>

        <div className="flex flex-col gap-2 mb-5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 text-[11.5px]" style={{ color: "#8B95A7" }}>
            <Zap size={11} style={{ color: plan.color }} />
            <span className="font-semibold" style={{ color: "#F5F7FA" }}>{plan.monthlyCredits.toLocaleString()}</span> credits/mo
          </div>
          <div className="flex items-center gap-2 text-[11.5px]" style={{ color: "#8B95A7" }}>
            <Link2 size={11} style={{ color: plan.color }} />
            {formatLimit(plan.pageLimit)} Page{plan.pageLimit === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-2 text-[11.5px]" style={{ color: "#8B95A7" }}>
            <Users size={11} style={{ color: plan.color }} />
            {formatLimit(plan.teamMemberLimit)} team member{plan.teamMemberLimit === 1 ? "" : "s"}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 mb-5">
          {FEATURES.slice(5).map(f => {
            const val = f.getValue(plan);
            const positive = val === true || val === "dedicated";
            const neutral = val === "limited" || val === "basic";
            return (
              <div key={f.label} className="flex items-center gap-2">
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  {positive ? <Check size={12} style={{ color: plan.color }} strokeWidth={2.5} />
                    : neutral ? <Minus size={11} style={{ color: "#F59E0B" }} />
                    : <X size={11} style={{ color: "rgba(255,255,255,0.2)" }} />}
                </div>
                <span className="text-[11.5px]" style={{ color: positive || neutral ? "#8B95A7" : "rgba(139,149,167,0.4)" }}>
                  {f.label}
                  {val === "limited" && " (limited)"}
                  {val === "basic" && " (basic)"}
                  {val === "dedicated" && " (dedicated)"}
                </span>
              </div>
            );
          })}
        </div>

        {isCurrent ? (
          <div className="w-full py-2.5 rounded-xl text-[12.5px] font-semibold text-center flex items-center justify-center gap-1.5" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Check size={13} /> Current plan
          </div>
        ) : (
          <button
            onClick={onSelect}
            className="w-full py-2.5 rounded-xl text-[12.5px] font-semibold text-white flex items-center justify-center gap-1.5 transition-all"
            style={{ background: plan.recommended ? plan.color : `${plan.color}CC`, boxShadow: plan.recommended ? `0 4px 20px ${plan.color}30` : "none" }}
          >
            Upgrade to {plan.name} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { planId, plan, monthlyAllocation, creditsUsed, creditsRemaining, renewalDate, connectedPageIds, teamMemberCount, upgradePlan, addCredits } = useWorkspace();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [checkout, setCheckout] = useState<CheckoutOrder | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Load active plans from DB
  useEffect(() => {
    fetch("/api/public/plans")
      .then(r => r.ok ? r.json() : { plans: [] })
      .then(({ plans: dbPlans }: { plans: DbPlan[] }) => {
        const merged = (dbPlans ?? []).map(mergePlan).filter((p): p is Plan => p !== null);
        setPlans(merged.length > 0 ? merged : Object.values(PLANS));
      })
      .catch(() => setPlans(Object.values(PLANS)))
      .finally(() => setLoadingPlans(false));
  }, []);

  const pct = Math.min(100, Math.round((creditsUsed / Math.max(1, monthlyAllocation)) * 100));

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-[22px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Billing</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Manage your subscription, plans, and billing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/billing/history" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-medium transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
            <History size={13} /> Billing History
          </Link>
          <Link href="/app/credits" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-medium text-white transition-all" style={{ background: "#6366F1" }}>
            <Zap size={13} /> Buy Credits
          </Link>
        </div>
      </div>

      {/* Current plan card */}
      <div className="p-6 rounded-2xl mb-10 relative overflow-hidden" style={{ background: "#101722", border: `1px solid ${plan.color}25` }}>
        <div className="absolute right-0 top-0 w-64 h-64 pointer-events-none" style={{ background: `radial-gradient(circle, ${plan.color}10 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
        <div className="relative flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${plan.color}18` }}>
                <CreditCard size={18} style={{ color: plan.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-semibold" style={{ color: "#F5F7FA" }}>{plan.name} Plan</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: plan.color, color: "#fff" }}>Active</span>
                </div>
                <div className="text-[13px]" style={{ color: "#8B95A7" }}>${plan.monthlyPrice}/month · Renews {renewalDate}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              {[
                { label: "Monthly Credits",  value: monthlyAllocation.toLocaleString(), sub: `${creditsRemaining.toLocaleString()} remaining` },
                { label: "Pages Connected",  value: `${connectedPageIds.length} / ${formatLimit(plan.pageLimit)}`, sub: "slots used" },
                { label: "Team Members",     value: `${teamMemberCount} / ${formatLimit(plan.teamMemberLimit)}`, sub: "members" },
                { label: "Next Renewal",     value: renewalDate, sub: "Monthly billing" },
              ].map(({ label, value, sub }) => (
                <div key={label}>
                  <div className="text-[13.5px] font-semibold mb-0.5" style={{ color: "#F5F7FA" }}>{value}</div>
                  <div className="text-[11px]" style={{ color: "#8B95A7", opacity: 0.7 }}>{label}</div>
                  <div className="text-[11px]" style={{ color: "#8B95A7", opacity: 0.45 }}>{sub}</div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? "#EF4444" : plan.color }} />
              </div>
              <div className="flex justify-between mt-1 text-[10.5px]" style={{ color: "#8B95A7", opacity: 0.6 }}>
                <span>{pct}% credits used</span>
                <span>Renews {renewalDate}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Link href="/app/settings" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-medium transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
              <ShieldCheck size={13} /> Payment Methods
            </Link>
          </div>
        </div>
      </div>

      {/* Plans section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>Choose a Plan</h2>
            <p className="text-[12.5px] mt-0.5" style={{ color: "#8B95A7" }}>Switch anytime. Changes apply at next billing cycle.</p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {BILLING_PERIODS.map(bp => (
              <button
                key={bp.id}
                onClick={() => setPeriod(bp.id)}
                className="relative px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap"
                style={{ background: period === bp.id ? "#6366F1" : "transparent", color: period === bp.id ? "#fff" : "#8B95A7" }}
              >
                {bp.label}
                {bp.discount > 0 && (
                  <span className="ml-1.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: period === bp.id ? "rgba(255,255,255,0.2)" : "rgba(16,185,129,0.15)", color: period === bp.id ? "#fff" : "#10B981" }}>
                    -{Math.round(bp.discount * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loadingPlans ? (
          <div className="text-center py-12 text-[13px]" style={{ color: "#8B95A7" }}>Loading plans…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {plans.map(p => (
              <PlanCard
                key={p.id}
                plan={p}
                period={period}
                isCurrent={p.id === planId}
                onSelect={() => setCheckout({ type: "plan", plan: p, period })}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 mt-8 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/app/billing/history" className="flex items-center gap-1.5 text-[12.5px] transition-colors" style={{ color: "#8B95A7" }}>
          <Clock size={13} /> View billing history
        </Link>
        <Link href="/app/credits" className="flex items-center gap-1.5 text-[12.5px] transition-colors" style={{ color: "#8B95A7" }}>
          <Zap size={13} /> Buy additional credits
        </Link>
        <Link href="/app/settings" className="flex items-center gap-1.5 text-[12.5px] transition-colors" style={{ color: "#8B95A7" }}>
          <CreditCard size={13} /> Manage payment methods
        </Link>
      </div>

      {checkout && (
        <CheckoutModal
          order={checkout}
          currentBalance={creditsRemaining}
          onClose={() => setCheckout(null)}
          onPlanUpgrade={id => upgradePlan(id as PlanId)}
          onCreditsAdded={amt => addCredits(amt, "Credit Purchase")}
        />
      )}
    </div>
  );
}
