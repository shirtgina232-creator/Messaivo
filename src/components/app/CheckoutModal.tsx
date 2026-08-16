"use client";

import { useState, useCallback } from "react";
import { X, Lock, Check, CreditCard, ChevronRight, ShieldCheck } from "lucide-react";
import { type Plan, type BillingPeriod, type CreditPackage, getPeriodPrice, getPeriodTotal, BILLING_PERIODS } from "@/lib/plans";

// ── Order types ───────────────────────────────────────────────────────────────

export type CheckoutOrder =
  | { type: "plan";    plan: Plan;          period: BillingPeriod; }
  | { type: "credits"; pkg: CreditPackage; };

type PaymentMethod = "card" | "paypal" | "applepay" | "googlepay";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCredits(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`
    : `${(n / 1_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
}

function generateTxnId() {
  return `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PayPalIcon() {
  return (
    <svg viewBox="0 0 80 24" width="64" height="20" fill="none">
      <text x="0" y="18" fontSize="16" fontWeight="800" fontFamily="Arial, sans-serif" fill="#003087">Pay</text>
      <text x="30" y="18" fontSize="16" fontWeight="800" fontFamily="Arial, sans-serif" fill="#009cde">Pal</text>
    </svg>
  );
}

function ApplePayIcon() {
  return (
    <div className="flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <span className="text-[13px] font-semibold">Pay</span>
    </div>
  );
}

function GooglePayIcon() {
  return (
    <div className="flex items-center gap-0.5">
      <span style={{ color: "#4285F4", fontWeight: 700, fontSize: 14 }}>G</span>
      <span style={{ color: "#EA4335", fontWeight: 700, fontSize: 14 }}>o</span>
      <span style={{ color: "#FBBC05", fontWeight: 700, fontSize: 14 }}>o</span>
      <span style={{ color: "#4285F4", fontWeight: 700, fontSize: 14 }}>g</span>
      <span style={{ color: "#34A853", fontWeight: 700, fontSize: 14 }}>le</span>
      <span style={{ color: "#5F6368", fontWeight: 600, fontSize: 13, marginLeft: 4 }}>Pay</span>
    </div>
  );
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
        {/* Plan badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${plan.color}20` }}>
            <span className="text-[15px] font-bold" style={{ color: plan.color }}>{plan.name[0]}</span>
          </div>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{plan.name} Plan</div>
            <div className="text-[12px]" style={{ color: "#8B95A7" }}>Billed {periodLabel}</div>
          </div>
        </div>

        {/* Line items */}
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

        {/* Pricing breakdown */}
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
              <div className="text-[18px] font-bold" style={{ color: "#F5F7FA" }}>
                ${total.toFixed(2)}
              </div>
              {period !== "monthly" && (
                <div className="text-[11px]" style={{ color: "#8B95A7" }}>${monthlyRate.toFixed(2)}/mo</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <div className="p-3 rounded-xl text-[11.5px]" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", color: "#8B95A7" }}>
            <span style={{ color: "#6366F1", fontWeight: 600 }}>Demo prototype.</span> No payment will be processed. Payment processing will be enabled when Stripe is connected.
          </div>
        </div>
      </div>
    );
  }

  // Credits order
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

      <div className="mt-auto pt-6">
        <div className="p-3 rounded-xl text-[11.5px]" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", color: "#8B95A7" }}>
          <span style={{ color: "#6366F1", fontWeight: 600 }}>Demo prototype.</span> No payment will be processed. Payment processing will be enabled when Stripe is connected.
        </div>
      </div>
    </div>
  );
}

// ── Payment Form Panel ────────────────────────────────────────────────────────

function PaymentPanel({ order, onSuccess }: { order: CheckoutOrder; onSuccess: (txnId: string, amount: number) => void }) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [processing, setProcessing] = useState(false);

  const totalAmount = order.type === "plan"
    ? getPeriodTotal(order.plan, order.period)
    : order.pkg.price;

  const handlePay = useCallback(async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1400));
    const txnId = generateTxnId();
    onSuccess(txnId, totalAmount);
  }, [totalAmount, onSuccess]);

  const methods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: "card",      label: "Card",       icon: <CreditCard size={16} /> },
    { id: "paypal",    label: "PayPal",     icon: <PayPalIcon /> },
    { id: "applepay",  label: "Apple Pay",  icon: <ApplePayIcon /> },
    { id: "googlepay", label: "Google Pay", icon: <GooglePayIcon /> },
  ];

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#F5F7FA",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    outline: "none",
    width: "100%",
    transition: "border-color 0.15s",
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Payment method</div>
        <div className="grid grid-cols-2 gap-2">
          {methods.map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all"
              style={{
                background: method === m.id ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${method === m.id ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <span style={{ color: method === m.id ? "#F5F7FA" : "#8B95A7" }}>{m.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {method === "card" ? (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[11.5px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Card number</label>
            <div className="relative">
              <input
                type="text"
                placeholder="1234  5678  9012  3456"
                value={cardNumber}
                onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                style={inputStyle}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <div className="w-6 h-4 rounded-sm flex items-center justify-center" style={{ background: "#1A1F71" }}>
                  <span style={{ fontSize: 5, color: "#fff", fontWeight: 900, letterSpacing: 0.5 }}>VISA</span>
                </div>
                <div className="w-6 h-4 rounded-sm flex items-center justify-center overflow-hidden" style={{ background: "#252525" }}>
                  <div className="flex">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#EB001B" }} />
                    <div className="w-3 h-3 rounded-full -ml-1.5" style={{ background: "#F79E1B", opacity: 0.9 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Expiry date</label>
              <input
                type="text"
                placeholder="MM / YY"
                value={expiry}
                onChange={e => setExpiry(formatExpiry(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>CVC</label>
              <input
                type="text"
                placeholder="123"
                value={cvc}
                onChange={e => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="text-[11.5px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Cardholder name</label>
            <input
              type="text"
              placeholder="Full name on card"
              value={cardName}
              onChange={e => setCardName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setSaveCard(!saveCard)}
              className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
              style={{ background: saveCard ? "#6366F1" : "rgba(255,255,255,0.06)", border: `1px solid ${saveCard ? "#6366F1" : "rgba(255,255,255,0.15)"}` }}
            >
              {saveCard && <Check size={10} color="#fff" strokeWidth={3} />}
            </div>
            <span className="text-[12px]" style={{ color: "#8B95A7" }}>Save this payment method for future purchases</span>
          </label>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 gap-2 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-[13px]" style={{ color: "#8B95A7" }}>
            {method === "paypal" && "You will be redirected to PayPal to complete your purchase."}
            {method === "applepay" && "Use Face ID or Touch ID to authorize payment."}
            {method === "googlepay" && "Complete payment with your saved Google Pay method."}
          </div>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={processing}
        className="w-full py-3.5 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all"
        style={{ background: processing ? "rgba(99,102,241,0.5)" : "#6366F1", boxShadow: processing ? "none" : "0 4px 24px rgba(99,102,241,0.35)" }}
      >
        {processing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock size={14} />
            Pay ${totalAmount.toFixed(2)}
            <ChevronRight size={14} />
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-4 text-[11px]" style={{ color: "#8B95A7" }}>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} style={{ color: "#10B981" }} />
          Secure payment
        </div>
        <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.1)" }} />
        <div className="flex items-center gap-1.5">
          <Lock size={11} />
          Encrypted checkout
        </div>
      </div>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({ txnId, amount, creditsAdded, newBalance, onClose }: {
  txnId: string;
  amount: number;
  creditsAdded: number;
  newBalance: number;
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex flex-col items-center justify-center py-10 px-8 text-center gap-0">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
        <Check size={28} style={{ color: "#10B981" }} strokeWidth={2.5} />
      </div>
      <h3 className="text-[20px] font-semibold mb-2" style={{ color: "#F5F7FA" }}>Payment successful</h3>
      <p className="text-[13px] mb-8 max-w-xs" style={{ color: "#8B95A7" }}>
        Your Messaivo credits have been added successfully.
      </p>

      <div className="w-full max-w-sm rounded-2xl p-5 mb-8 flex flex-col gap-3" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        {[
          { label: "Credits added",   value: `+${creditsAdded.toLocaleString()}`, color: "#10B981" },
          { label: "New balance",     value: newBalance.toLocaleString(),          color: "#F5F7FA" },
          { label: "Amount charged",  value: `$${amount.toFixed(2)}`,              color: "#F5F7FA" },
          { label: "Transaction ID",  value: txnId,                               color: "#8B95A7" },
          { label: "Date",            value: today,                               color: "#8B95A7" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: "#8B95A7" }}>{label}</span>
            <span className="text-[12.5px] font-medium" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full max-w-sm py-3 rounded-xl text-[13.5px] font-semibold text-white"
        style={{ background: "#6366F1" }}
      >
        Go to Dashboard
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

export function CheckoutModal({ order, currentBalance, onClose, onPlanUpgrade, onCreditsAdded }: CheckoutModalProps) {
  const [stage, setStage] = useState<"checkout" | "success">("checkout");
  const [result, setResult] = useState<{ txnId: string; amount: number; creditsAdded: number; newBalance: number } | null>(null);

  const handleSuccess = useCallback((txnId: string, amount: number) => {
    let creditsAdded = 0;
    let newBalance = 0;

    if (order.type === "plan") {
      creditsAdded = order.plan.monthlyCredits;
      newBalance = order.plan.monthlyCredits;
      onPlanUpgrade?.(order.plan.id);
    } else {
      creditsAdded = order.pkg.credits;
      newBalance = currentBalance + order.pkg.credits;
      onCreditsAdded?.(order.pkg.credits);
    }

    setResult({ txnId, amount, creditsAdded, newBalance });
    setStage("success");
  }, [order, currentBalance, onPlanUpgrade, onCreditsAdded]);

  const title = order.type === "plan"
    ? `Upgrade to ${order.plan.name}`
    : "Buy Credits";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={stage === "success" ? onClose : undefined} />
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: stage === "success" ? 480 : 820, background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>
            {stage === "success" ? "Payment Confirmation" : title}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={16} style={{ color: "#8B95A7" }} />
          </button>
        </div>

        {stage === "success" && result ? (
          <SuccessScreen {...result} onClose={onClose} />
        ) : (
          <div className="grid md:grid-cols-[1fr_1.1fr]">
            {/* Left: Order summary */}
            <div className="p-6 border-r md:min-h-[480px]" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)" }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-5" style={{ color: "#8B95A7" }}>Order Summary</div>
              <OrderSummary order={order} />
            </div>

            {/* Right: Payment */}
            <div className="p-6">
              <PaymentPanel order={order} onSuccess={handleSuccess} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
