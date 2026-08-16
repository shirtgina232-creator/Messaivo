"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "What is Messaivo?",
    a: "Messaivo is a customer messaging CRM for businesses. It lets you connect your Facebook Pages, manage Messenger conversations in one unified inbox, organize your audience, create reusable message templates, send permitted broadcasts, and track your messaging performance — all from one workspace.",
  },
  {
    q: "How do I connect my Facebook Page?",
    a: "You connect your Facebook Page through the official Meta authorization flow. During setup, you'll authorize Messaivo to access your Page via Facebook's own login and permissions system. Messaivo never asks for your Facebook credentials directly.",
  },
  {
    q: "Can multiple Pages be connected?",
    a: "Yes. The number of Pages you can connect depends on your plan. Starter supports 1 Page, Professional supports up to 5 Pages, and Business supports up to 20 Pages.",
  },
  {
    q: "Can my team use Messaivo?",
    a: "Yes. On Professional and Business plans, you can invite team members to your workspace and assign them roles. This lets your team collaborate on conversations, manage audiences, and more — without sharing account credentials.",
  },
  {
    q: "What are broadcasts?",
    a: "Broadcasts let you send a message to a group of audience members at once, instead of messaging each person individually. They're useful for announcements, promotions, and follow-ups. However, broadcasts are subject to platform messaging policies and can only be sent to eligible customers.",
  },
  {
    q: "Are all customers eligible for broadcasts?",
    a: "No. Eligibility for receiving broadcast messages is determined by Meta's Messenger platform policies, including whether a customer has interacted with your Page within the allowed time window. Messaivo clearly shows you the eligible audience size before you send a broadcast.",
  },
  {
    q: "How does billing work?",
    a: "You can choose to be billed monthly or annually. Annual billing offers approximately 20% savings over monthly. You'll be charged at the start of each billing period. All prices are in USD.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel your subscription at any time. On cancellation, your plan remains active until the end of the current billing period, after which your workspace will be downgraded. You won't be charged again after cancellation.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted)", opacity: 0.5 }}>
            FAQ
          </p>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-[-0.03em] leading-tight" style={{ color: "var(--text)" }}>
            Common questions.
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: openIndex === i ? "var(--active-bg)" : "var(--card)",
                border: `1px solid ${openIndex === i ? "rgba(108,99,255,0.2)" : "var(--border)"}`,
              }}
            >
              <button
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span
                  className="text-[14px] font-medium leading-snug transition-colors"
                  style={{ color: openIndex === i ? "var(--text)" : "var(--muted)" }}
                >
                  {faq.q}
                </span>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-150"
                  style={{ background: openIndex === i ? "rgba(108,99,255,0.2)" : "var(--input-bg)" }}
                >
                  {openIndex === i ? (
                    <Minus size={12} style={{ color: "#6C63FF" }} />
                  ) : (
                    <Plus size={12} style={{ color: "var(--muted)" }} />
                  )}
                </div>
              </button>

              <div
                className={`transition-all duration-200 overflow-hidden ${
                  openIndex === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-5 pb-4">
                  <p
                    className="text-[13.5px] leading-relaxed border-t pt-3"
                    style={{ color: "var(--muted)", borderColor: "var(--border)" }}
                  >
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
