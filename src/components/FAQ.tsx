"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import Script from "next/script";

const faqs = [
  {
    q: "What is Messaivo?",
    a: "Messaivo is a Facebook Messenger CRM for businesses. It lets you connect your Facebook Pages, manage all Messenger conversations in one unified inbox, organize your audience into contacts, create reusable message templates, send permitted broadcasts to eligible customers, and track your messaging performance — all from one workspace.",
  },
  {
    q: "Who is Messaivo for?",
    a: "Messaivo is designed for any business that communicates with customers through Facebook Messenger. This includes e-commerce stores, customer support teams, restaurants, service businesses, real estate agencies, educational providers, and any other business managing inquiries through one or more Facebook Pages.",
  },
  {
    q: "How do I connect my Facebook Page?",
    a: "You connect your Facebook Page through the official Meta authorization flow. During setup, you'll authorize Messaivo to access your Page via Facebook's own login and permissions system. Messaivo never asks for your Facebook credentials directly — authentication always goes through Meta's official OAuth process.",
  },
  {
    q: "Can I connect multiple Facebook Pages?",
    a: "Yes. Messaivo supports multiple Facebook Pages in one workspace. Starter supports 1 Page, Professional supports up to 5 Pages, and Business supports up to 20 Pages. All Pages are managed from the same inbox and audience view.",
  },
  {
    q: "Can my team use Messaivo together?",
    a: "Yes. On Professional and Business plans, you can invite team members to your workspace and assign them roles with specific permissions. This means your team can collaborate on conversations and audience management without sharing account credentials.",
  },
  {
    q: "What are message templates?",
    a: "Message templates are saved messages you can reuse across multiple conversations. They support dynamic variables like {{first_name}} and {{page_name}}, which are automatically filled in when you send. Templates save time on common replies and help your team maintain a consistent communication style.",
  },
  {
    q: "What are broadcasts, and how do they work?",
    a: "Broadcasts let you send a message to a group of audience members at once, instead of messaging each person individually. They are useful for order updates, appointment reminders, service notifications, and similar transactional messages. Broadcasts are subject to Meta's Messenger platform policies — only customers who have interacted with your Page within the allowed eligibility window can receive them. Messaivo shows you the eligible audience size before you send.",
  },
  {
    q: "Are all customers eligible to receive broadcasts?",
    a: "No. Eligibility is determined by Meta's messaging policies, including whether a customer has actively engaged with your Page within a recent time window. Messaivo enforces these rules automatically and clearly shows you how many of your contacts are currently eligible before you create a broadcast. We never attempt to send to ineligible recipients.",
  },
  {
    q: "Does Messaivo support promotional broadcasts?",
    a: "Messaivo supports permitted broadcasts that comply with Meta's Messenger policies. Unsolicited promotional messages outside the platform's eligibility window are not permitted and Messaivo does not enable them. Suitable use cases include order updates, appointment reminders, follow-ups, and service notifications.",
  },
  {
    q: "How does Messaivo connect to Facebook — is it official?",
    a: "Yes. Messaivo connects to Facebook Pages through Meta's official Graph API and uses the standard OAuth authorization flow. Customers authorize access through Facebook's own interface — Messaivo never receives or stores your Facebook credentials.",
  },
  {
    q: "How does billing work?",
    a: "You can choose to be billed monthly or annually. Annual billing offers approximately 20% savings compared to monthly. You are charged at the start of each billing period. All prices are in USD. You can upgrade, downgrade, or cancel your plan at any time.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. You can cancel at any time. Your plan remains active until the end of the current billing period. After that, your workspace is downgraded and you will not be charged again. There are no cancellation fees.",
  },
  {
    q: "Is Messaivo secure?",
    a: "Messaivo is built with security as a foundational requirement. Access to your workspace is protected through secure authentication. Facebook Page tokens are encrypted before storage. Team access is controlled through role-based permissions, so each team member sees only what they need. Your workspace data is isolated from other businesses.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Your data remains accessible until the end of your billing period. After downgrade, your workspace is limited to the free tier's capabilities. You can request deletion of your data at any time by contacting us at hello@messaivo.com.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 relative">
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted)", opacity: 0.5 }}>
            FAQ
          </p>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-[-0.03em] leading-tight" style={{ color: "var(--text)" }}>
            Answers to common questions.
          </h2>
          <p className="text-[15px] mt-4 max-w-md mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
            Can&apos;t find what you&apos;re looking for?{" "}
            <a href="/contact" className="underline underline-offset-2" style={{ color: "var(--muted)" }}>
              Contact us
            </a>.
          </p>
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
                aria-expanded={openIndex === i}
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
