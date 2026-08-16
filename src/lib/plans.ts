// Centralized plan/pricing configuration — single source of truth.
// All pricing, limits, and credit packages are defined here.
// Ready for Stripe integration: map planId → Stripe price IDs when connecting.

export type PlanId = "lite" | "starter" | "growth" | "pro" | "enterprise";
export type BillingPeriod = "monthly" | "quarterly" | "halfyearly";

export const BILLING_PERIODS: { id: BillingPeriod; label: string; shortLabel: string; discount: number; months: number }[] = [
  { id: "monthly",    label: "Monthly",     shortLabel: "mo",  discount: 0,   months: 1 },
  { id: "quarterly",  label: "Quarterly",   shortLabel: "mo",  discount: 0.1, months: 3 },
  { id: "halfyearly", label: "Half-Yearly", shortLabel: "mo",  discount: 0.2, months: 6 },
];

export type Plan = {
  id: PlanId;
  name: string;
  description: string;
  monthlyPrice: number;       // base monthly price (USD)
  monthlyCredits: number;
  costPerThousand: number;    // USD per 1,000 credits at monthly rate
  pageLimit: number;          // 9999 = unlimited
  teamMemberLimit: number;    // 9999 = unlimited
  audienceStorage: number;    // contacts; 9_999_999 = unlimited
  color: string;
  recommended?: boolean;
  // Feature flags
  premiumInbox: boolean;
  bulkMessaging: boolean;
  advancedFilters: boolean | "limited";
  personalizedMessages: boolean;
  scheduledBroadcasts: boolean;
  liveDeliveryTracking: boolean | "basic";
  aiOptimization: boolean;
  prioritySupport: boolean | "dedicated";
};

// Price per billing period (monthly rate shown on card)
export function getPeriodPrice(plan: Plan, period: BillingPeriod): number {
  const b = BILLING_PERIODS.find(p => p.id === period)!;
  return Math.round(plan.monthlyPrice * (1 - b.discount) * 100) / 100;
}

// Total charge for the billing period
export function getPeriodTotal(plan: Plan, period: BillingPeriod): number {
  const b = BILLING_PERIODS.find(p => p.id === period)!;
  return Math.round(getPeriodPrice(plan, period) * b.months * 100) / 100;
}

// Display a numeric limit (9999+ → "Unlimited")
export function formatLimit(n: number): string {
  return n >= 9999 ? "Unlimited" : n.toLocaleString();
}

export const PLANS: Record<PlanId, Plan> = {
  lite: {
    id: "lite",
    name: "Lite",
    description: "For individuals testing customer messaging with a single Facebook Page.",
    monthlyPrice: 9,
    monthlyCredits: 30_000,
    costPerThousand: 0.300,
    pageLimit: 1,
    teamMemberLimit: 1,
    audienceStorage: 5_000,
    color: "#8B95A7",
    premiumInbox: true,
    bulkMessaging: false,
    advancedFilters: false,
    personalizedMessages: false,
    scheduledBroadcasts: false,
    liveDeliveryTracking: false,
    aiOptimization: false,
    prioritySupport: false,
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For small businesses ready to grow their customer conversations.",
    monthlyPrice: 29,
    monthlyCredits: 300_000,
    costPerThousand: 0.097,
    pageLimit: 3,
    teamMemberLimit: 3,
    audienceStorage: 50_000,
    color: "#6C63FF",
    premiumInbox: true,
    bulkMessaging: true,
    advancedFilters: "limited",
    personalizedMessages: true,
    scheduledBroadcasts: true,
    liveDeliveryTracking: "basic",
    aiOptimization: false,
    prioritySupport: false,
  },
  growth: {
    id: "growth",
    name: "Growth",
    description: "For scaling businesses needing powerful automation and deep analytics.",
    monthlyPrice: 69,
    monthlyCredits: 800_000,
    costPerThousand: 0.086,
    pageLimit: 10,
    teamMemberLimit: 10,
    audienceStorage: 200_000,
    color: "#6366F1",
    recommended: true,
    premiumInbox: true,
    bulkMessaging: true,
    advancedFilters: true,
    personalizedMessages: true,
    scheduledBroadcasts: true,
    liveDeliveryTracking: true,
    aiOptimization: true,
    prioritySupport: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For high-volume operations with priority support and expanded scale.",
    monthlyPrice: 149,
    monthlyCredits: 2_000_000,
    costPerThousand: 0.075,
    pageLimit: 25,
    teamMemberLimit: 25,
    audienceStorage: 1_000_000,
    color: "#3B82F6",
    premiumInbox: true,
    bulkMessaging: true,
    advancedFilters: true,
    personalizedMessages: true,
    scheduledBroadcasts: true,
    liveDeliveryTracking: true,
    aiOptimization: true,
    prioritySupport: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with unlimited scale and dedicated support.",
    monthlyPrice: 299,
    monthlyCredits: 4_500_000,
    costPerThousand: 0.066,
    pageLimit: 9999,
    teamMemberLimit: 9999,
    audienceStorage: 9_999_999,
    color: "#8B5CF6",
    premiumInbox: true,
    bulkMessaging: true,
    advancedFilters: true,
    personalizedMessages: true,
    scheduledBroadcasts: true,
    liveDeliveryTracking: true,
    aiOptimization: true,
    prioritySupport: "dedicated",
  },
};

export const PLAN_LIST: Plan[] = (["lite", "starter", "growth", "pro", "enterprise"] as PlanId[]).map(id => PLANS[id]);

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

// ── Credit Packages (one-time purchase) ──────────────────────────────────────
// Ready for Stripe: map id → Stripe price ID when connecting.

export type CreditPackage = {
  id: string;
  credits: number;
  price: number;
  costPerThousand: number;
  popular?: boolean;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "cp1", credits:    50_000, price:  14, costPerThousand: 0.280 },
  { id: "cp2", credits:   100_000, price:  24, costPerThousand: 0.240 },
  { id: "cp3", credits:   500_000, price:  89, costPerThousand: 0.178, popular: true },
  { id: "cp4", credits: 1_000_000, price: 159, costPerThousand: 0.159 },
  { id: "cp5", credits: 5_000_000, price: 599, costPerThousand: 0.120 },
];
