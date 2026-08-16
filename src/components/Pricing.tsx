"use client";

import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: { monthly: 19, annual: 15 },
    description: "For solo operators and small businesses getting started.",
    highlight: false,
    badge: null,
    features: [
      "1 connected Facebook Page",
      "Messenger inbox",
      "Audience management",
      "Message templates",
      "Basic analytics",
      "Secure workspace access",
    ],
    cta: "Start with Starter",
    ctaStyle: "secondary",
  },
  {
    name: "Professional",
    price: { monthly: 49, annual: 39 },
    description: "For growing teams that need more pages and broadcast tools.",
    highlight: true,
    badge: "Most popular",
    features: [
      "Up to 5 Facebook Pages",
      "Team members & roles",
      "Advanced audience management",
      "Message templates",
      "Permitted broadcasts",
      "Advanced analytics",
      "Secure workspace access",
    ],
    cta: "Start with Professional",
    ctaStyle: "primary",
  },
  {
    name: "Business",
    price: { monthly: 99, annual: 79 },
    description: "For established businesses managing large customer operations.",
    highlight: false,
    badge: null,
    features: [
      "Up to 20 Facebook Pages",
      "Multiple team members",
      "Advanced analytics & reporting",
      "Workspace management",
      "Permitted broadcasts",
      "Priority support",
      "Secure workspace access",
    ],
    cta: "Start with Business",
    ctaStyle: "secondary",
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(108,99,255,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#8B95A7]/50 mb-4">
            Pricing
          </p>
          <h2 className="text-[36px] md:text-[52px] font-semibold tracking-[-0.03em] leading-tight text-[#F5F7FA] max-w-2xl mx-auto">
            Simple pricing. No surprises.
          </h2>
          <p className="text-[16px] text-[#8B95A7] mt-4 max-w-lg mx-auto leading-relaxed">
            Choose a plan that fits your team. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl"
            style={{ background: "rgba(16,21,31,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                billing === "monthly"
                  ? "bg-[#6C63FF] text-white shadow-[0_0_20px_rgba(108,99,255,0.3)]"
                  : "text-[#8B95A7] hover:text-[#F5F7FA]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 flex items-center gap-2 ${
                billing === "annual"
                  ? "bg-[#6C63FF] text-white shadow-[0_0_20px_rgba(108,99,255,0.3)]"
                  : "text-[#8B95A7] hover:text-[#F5F7FA]"
              }`}
            >
              Annual
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: billing === "annual" ? "rgba(255,255,255,0.2)" : "rgba(16,185,129,0.15)",
                  color: billing === "annual" ? "#fff" : "#10B981",
                }}
              >
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative flex flex-col p-6 rounded-2xl transition-all duration-200"
              style={{
                background: plan.highlight
                  ? "rgba(108,99,255,0.07)"
                  : "rgba(16,21,31,0.7)",
                border: plan.highlight
                  ? "1px solid rgba(108,99,255,0.3)"
                  : "1px solid rgba(255,255,255,0.07)",
                boxShadow: plan.highlight
                  ? "0 0 50px rgba(108,99,255,0.1)"
                  : "none",
              }}
            >
              {plan.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: "#6C63FF",
                    color: "#fff",
                    boxShadow: "0 4px 16px rgba(108,99,255,0.4)",
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-[15px] font-semibold text-[#F5F7FA] mb-1">
                  {plan.name}
                </h3>
                <p className="text-[12.5px] text-[#8B95A7] leading-snug">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-[42px] font-semibold tracking-tight text-[#F5F7FA] leading-none">
                    ${plan.price[billing]}
                  </span>
                  <span className="text-[13px] text-[#8B95A7] mb-1.5">/mo</span>
                </div>
                {billing === "annual" && (
                  <p className="text-[11px] text-[#8B95A7] mt-1">
                    Billed annually · ${plan.price.annual * 12}/yr
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: plan.highlight
                          ? "rgba(108,99,255,0.2)"
                          : "rgba(255,255,255,0.06)",
                      }}
                    >
                      <Check
                        size={9}
                        style={{ color: plan.highlight ? "#6C63FF" : "#10B981" }}
                        strokeWidth={2.5}
                      />
                    </div>
                    <span className="text-[13px] text-[#8B95A7] leading-snug">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="/signup"
                className={`w-full text-center py-3 rounded-xl text-[13.5px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 group ${
                  plan.highlight
                    ? "bg-[#6C63FF] hover:bg-[#5B52E8] text-white shadow-[0_0_24px_rgba(108,99,255,0.3)]"
                    : "text-[#F5F7FA] hover:bg-[rgba(255,255,255,0.06)]"
                }`}
                style={
                  !plan.highlight
                    ? { border: "1px solid rgba(255,255,255,0.1)" }
                    : {}
                }
              >
                {plan.cta}
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-[12.5px] text-[#8B95A7]/60 mt-8">
          All plans include secure workspace access.{" "}
          <Link href="/pricing" className="text-[#6C63FF] hover:underline">
            Compare plans in detail
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
