"use client";

import { X, CreditCard } from "lucide-react";
import { type Plan, type BillingPeriod, type CreditPackage, getPeriodPrice, getPeriodTotal, BILLING_PERIODS } from "@/lib/plans";

// ── Order types ───────────────────────────────────────────────────────────────

export type CheckoutOrder =
  | { type: "plan";    plan: Plan;          period: BillingPeriod; }
  | { type: "credits"; pkg: CreditPackage; };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCredits(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`
    : `${(n / 1_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
}

// ── Order Summary Panel ───────────────────────────────────────────────────────

function OrderSummary({ order }: { order: CheckoutOrder }) {
  if (order.type === "plan") {
    const { plan, period } = order;
    const monthlyRate = getPeriodPrice(plan, period);
    const total = getPeriodTotal(plan, period);
    const bp = BILLING_PERIODS.find(b => b.id === period)!;
    const discount = period !== "monthly" ? Math.round((plan.monthlyPrice - monthlyRate) * bp.months * 100) / 100 : 0;
    const periodLabel = bp.label;

    return (
      <div className="flex flex-col gap-0 h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${plan.color}20` }}>
            <span className="text-[15px] font-bold" style={{ color: plan.color }}>{plan.name[0]}</span>
          </div>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{plan.name} Plan</div>
            <div className="text-[12px]" style={{ color: "#8B95A7" }}>Billed {periodLabel}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-6 pb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {[
            { label: "Credits per month", value: plan.monthlyCredits.toLocaleString() },
            { label: "Facebook Pages", value: plan.pageLimit >= 9999 ? "Unlimited" : `Up to ${plan.pageLimit}` },
            { label: "Team members", value: plan.teamMemberLimit >= 9999 ? "Unlimited" : `Up to ${plan.teamMemberLimit}` },
            { label: "Billing period", value: periodLabel },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "#8B95A7" }}>{label}</span>
              <span className="text-[12px] font-medium" style={{ color: "#F5F7FA" }}>{value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px]" style={{ color: "#8B95A7" }}>Monthly rate</span>
            <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>${plan.monthlyPrice.toFixed(2)}/mo</span>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[12.5px]" style={{ color: "#10B981" }}>{periodLabel} discount ({Math.round(bp.discount * 100)}% off)</span>
              <span className="text-[12.5px] font-medium" style={{ color: "#10B981" }}>−${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[12.5px]" style={{ color: "#8B95A7" }}>Tax (est.)</span>
            <span className="text-[12.5px]" style={{ color: "#8B95A7" }}>$0.00</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <span className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>
              {period === "monthly" ? "Total today" : `Total (${bp.months} months)`}
            </span>
            <div className="text-right">
              <div className="text-[18px] font-bold" style={{ color: "#F5F7FA" }}>${total.toFixed(2)}</div>
              {period !== "monthly" && (
                <div className="text-[11px]" style={{ color: "#8B95A7" }}>${monthlyRate.toFixed(2)}/mo</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { pkg } = order;
  return (
    <div className="flex flex-col gap-0 h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
          <span className="text-[14px] font-bold" style={{ color: "#6366F1" }}>{fmtCredits(pkg.credits)}</span>
        </div>
        <div>
          <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{pkg.credits.toLocaleString()} Credits</div>
          <div className="text-[12px]" style={{ color: "#8B95A7" }}>One-time purchase · Never expire</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6 pb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {[
          { label: "Credits", value: pkg.credits.toLocaleString() },
          { label: "Cost per 1,000", value: `$${pkg.costPerThousand.toFixed(3)}` },
          { label: "Expiration", value: "Never" },
          { label: "Purchase type", value: "One-time" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: "#8B95A7" }}>{label}</span>
            <span className="text-[12px] font-medium" style={{ color: "#F5F7FA" }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px]" style={{ color: "#8B95A7" }}>Subtotal</span>
          <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>${pkg.price.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12.5px]" style={{ color: "#8B95A7" }}>Tax (est.)</span>
          <span className="text-[12.5px]" style={{ color: "#8B95A7" }}>$0.00</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <span className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>Total today</span>
          <span className="text-[18px] font-bold" style={{ color: "#F5F7FA" }}>${pkg.price.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Payment Coming Soon Panel ─────────────────────────────────────────────────

function PaymentPanel({ order, onClose }: { order: CheckoutOrder; onClose: () => void }) {
  const totalAmount = order.type === "plan"
    ? getPeriodTotal(order.plan, order.period)
    : order.pkg.price;

  const label = order.type === "plan"
    ? `${order.plan.name} plan`
    : `${order.pkg.credits.toLocaleString()} credit package`;

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10 px-6 text-center h-full">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
        <CreditCard size={24} style={{ color: "#6366F1" }} />
      </div>
      <div>
        <h3 className="text-[16px] font-semibold mb-2" style={{ color: "#F5F7FA" }}>Payment processing coming soon</h3>
        <p className="text-[13px] leading-relaxed max-w-xs" style={{ color: "#8B95A7" }}>
          Stripe integration is not yet configured. Online payment for the {label} (${totalAmount.toFixed(2)}) will be available shortly.
        </p>
      </div>
      <button
        onClick={onClose}
        className="px-6 py-2.5 rounded-xl text-[13.5px] font-semibold text-white"
        style={{ background: "#6366F1" }}
      >
        Close
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type CheckoutModalProps = {
  order: CheckoutOrder;
  currentBalance: number;
  onClose: () => void;
  onPlanUpgrade?: (planId: string) => void;
  onCreditsAdded?: (amount: number) => void;
};

export function CheckoutModal({ order, onClose }: CheckoutModalProps) {
  const title = order.type === "plan"
    ? `Upgrade to ${order.plan.name}`
    : "Buy Credits";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: 820, background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={16} style={{ color: "#8B95A7" }} />
          </button>
        </div>

        <div className="grid md:grid-cols-[1fr_1.1fr]">
          <div className="p-6 border-r md:min-h-[420px]" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)" }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-5" style={{ color: "#8B95A7" }}>Order Summary</div>
            <OrderSummary order={order} />
          </div>
          <div className="p-6">
            <PaymentPanel order={order} onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}
