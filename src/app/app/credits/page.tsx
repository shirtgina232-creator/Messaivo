"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, TrendingUp, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { CREDIT_PACKAGES, type CreditPackage } from "@/lib/plans";
import { CheckoutModal, type CheckoutOrder } from "@/components/app/CheckoutModal";

// ── Credit Package Card ───────────────────────────────────────────────────────

function PackageCard({ pkg, onBuy }: { pkg: CreditPackage; onBuy: () => void }) {
  const accentColor = pkg.popular ? "#6366F1" : "#8B95A7";

  return (
    <div
      className="relative flex flex-col p-5 rounded-2xl transition-all group"
      style={{
        background: pkg.popular ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.05))" : "#101722",
        border: `1px solid ${pkg.popular ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.08)"}`,
        boxShadow: pkg.popular ? "0 0 30px rgba(99,102,241,0.12)" : "none",
      }}
    >
      {pkg.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap" style={{ background: "#6366F1", color: "#fff" }}>
          Most Popular
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accentColor}18` }}>
          <Zap size={16} style={{ color: accentColor }} />
        </div>
        <div>
          <div className="text-[16px] font-bold" style={{ color: "#F5F7FA" }}>
            {pkg.credits >= 1_000_000
              ? `${(pkg.credits / 1_000_000).toFixed(pkg.credits % 1_000_000 === 0 ? 0 : 1)}M`
              : `${(pkg.credits / 1_000).toFixed(0)}K`}
            {" "}<span className="text-[13px] font-normal" style={{ color: "#8B95A7" }}>credits</span>
          </div>
          <div className="text-[11px]" style={{ color: "#8B95A7" }}>{pkg.credits.toLocaleString()} total</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[28px] font-bold leading-none mb-1" style={{ color: "#F5F7FA" }}>${pkg.price}</div>
        <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>one-time purchase</div>
      </div>

      <div className="flex flex-col gap-2 mb-5 flex-1 text-[11.5px]" style={{ color: "#8B95A7" }}>
        <div className="flex items-center justify-between">
          <span>Cost per 1,000</span>
          <span className="font-medium" style={{ color: "#F5F7FA" }}>${pkg.costPerThousand.toFixed(3)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Expiration</span>
          <span className="font-medium" style={{ color: "#10B981" }}>Never</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Type</span>
          <span className="font-medium" style={{ color: "#F5F7FA" }}>One-time</span>
        </div>
      </div>

      <button
        onClick={onBuy}
        className="w-full py-2.5 rounded-xl text-[12.5px] font-semibold text-white flex items-center justify-center gap-1.5 transition-all"
        style={{
          background: pkg.popular ? "#6366F1" : "rgba(255,255,255,0.07)",
          color: pkg.popular ? "#fff" : "#F5F7FA",
          border: pkg.popular ? "none" : "1px solid rgba(255,255,255,0.1)",
          boxShadow: pkg.popular ? "0 4px 20px rgba(99,102,241,0.3)" : "none",
        }}
      >
        Buy Credits <ArrowRight size={12} />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const {
    plan, monthlyAllocation, creditsUsed, creditsRemaining, renewalDate,
    creditActivity, addCredits, unlimitedCredits,
  } = useWorkspace();

  const [checkout, setCheckout] = useState<CheckoutOrder | null>(null);

  const totalCredits = unlimitedCredits ? monthlyAllocation : creditsRemaining + creditsUsed;
  const pct = unlimitedCredits ? 0 : Math.min(100, Math.round((creditsUsed / Math.max(1, totalCredits)) * 100));
  const low = !unlimitedCredits && pct >= 80;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Credits</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Track usage and purchase additional messaging credits.</p>
        </div>
        <Link
          href="/app/billing"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}
        >
          <TrendingUp size={14} /> Upgrade Plan
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Monthly Allocation", value: unlimitedCredits ? "Unlimited" : monthlyAllocation.toLocaleString(), color: "#6366F1" },
          { label: "Used This Month",    value: creditsUsed.toLocaleString(),                                          color: "#F59E0B" },
          { label: "Remaining",          value: unlimitedCredits ? "Unlimited" : creditsRemaining.toLocaleString(),   color: low ? "#EF4444" : "#10B981" },
          { label: "Renewal Date",       value: renewalDate,                                                           color: "#22D3EE" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[13px] font-semibold mb-0.5" style={{ color }}>{value}</div>
            <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Balance card */}
      <div className="p-6 rounded-2xl mb-8 relative overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="absolute right-0 top-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="relative">
          <div className="flex items-end gap-2 mb-1">
            <span className="text-[42px] font-semibold leading-none" style={{ color: low ? "#EF4444" : "#F5F7FA" }}>
              {unlimitedCredits ? "∞" : creditsRemaining.toLocaleString()}
            </span>
            {!unlimitedCredits && (
              <span className="text-[16px] mb-1.5" style={{ color: "#8B95A7" }}>/ {totalCredits.toLocaleString()}</span>
            )}
          </div>
          <div className="text-[13px] mb-5" style={{ color: "#8B95A7" }}>
            {unlimitedCredits ? "unlimited credits" : "credits remaining"} · {plan.name} plan
          </div>

          {!unlimitedCredits && (
            <>
              <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: low ? "#EF4444" : "#6366F1" }} />
              </div>
              <div className="flex justify-between text-[11px]" style={{ color: "#8B95A7" }}>
                <span>{pct}% used</span>
                <span>Renews {renewalDate}</span>
              </div>
            </>
          )}

          {low && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Zap size={14} style={{ color: "#EF4444" }} />
              <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>Credits running low — buy more to avoid interruptions.</span>
              <Link href="/app/billing" className="ml-auto text-[12px] font-semibold flex items-center gap-1 shrink-0" style={{ color: "#6366F1" }}>
                Upgrade plan <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Buy Credits section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>Buy Credits</h2>
            <p className="text-[12.5px] mt-0.5" style={{ color: "#8B95A7" }}>One-time purchase — credits never expire and stack with your plan.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {CREDIT_PACKAGES.map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onBuy={() => setCheckout({ type: "credits", pkg })}
            />
          ))}
        </div>
      </div>

      {/* Credit activity */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <h2 className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>Credit Activity</h2>
        </div>
        <div
          className="hidden md:grid gap-4 px-5 py-3 border-b text-[10px] font-semibold uppercase tracking-wider"
          style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr", borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "#8B95A7", opacity: 0.6 }}
        >
          {["Date", "Operation", "Amount", "Balance"].map(h => <span key={h}>{h}</span>)}
        </div>
        {creditActivity.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px]" style={{ color: "#8B95A7" }}>
            No credit activity yet.
          </div>
        ) : creditActivity.map(row => (
          <div
            key={row.id}
            className="flex md:grid items-center gap-3 md:gap-4 px-5 py-3.5 border-b hover:bg-white/[0.015] transition-colors flex-wrap"
            style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr", borderColor: "rgba(255,255,255,0.04)" }}
          >
            <span className="text-[12px]" style={{ color: "#8B95A7" }}>{row.date}</span>
            <span className="text-[12.5px] font-medium truncate" style={{ color: "#F5F7FA" }}>{row.operation}</span>
            <span className={`text-[12.5px] font-semibold ${row.amount > 0 ? "text-green-400" : "text-red-400"}`}>
              {row.amount > 0 ? "+" : ""}{row.amount.toLocaleString()}
            </span>
            <span className="text-[12px] font-medium" style={{ color: "#F5F7FA" }}>{row.balance.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {checkout && (
        <CheckoutModal
          order={checkout}
          currentBalance={creditsRemaining}
          onClose={() => setCheckout(null)}
          onCreditsAdded={amt => addCredits(amt, "Credit Purchase")}
        />
      )}
    </div>
  );
}
