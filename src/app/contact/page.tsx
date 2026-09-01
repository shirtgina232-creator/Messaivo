import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Clock, HelpCircle, MessageSquare } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get help with Messaivo. Reach our support team by email at hello@messaivo.com. We respond within one business day.",
  alternates: { canonical: "https://messaivo.com/contact" },
};

const supportTopics = [
  {
    icon: HelpCircle,
    title: "Getting started",
    description: "Need help connecting your first Facebook Page or setting up your workspace?",
    color: "#6C63FF",
  },
  {
    icon: MessageSquare,
    title: "Feature questions",
    description: "Questions about templates, broadcasts, audience management, or team roles?",
    color: "#22D3EE",
  },
  {
    icon: Clock,
    title: "Billing & plans",
    description: "Questions about your subscription, invoices, or upgrading your plan?",
    color: "#10B981",
  },
];

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-[#8B95A7]/50 mb-4">
              Support
            </p>
            <h1 className="text-[44px] md:text-[56px] font-semibold tracking-[-0.03em] leading-tight text-[#F5F7FA] mb-4">
              We&apos;re here to help.
            </h1>
            <p className="text-[16px] text-[#8B95A7] leading-relaxed max-w-xl mx-auto">
              Whether you have a question about features, need help with setup, or want to talk about your plan —
              reach out and we&apos;ll get back to you promptly.
            </p>
          </div>

          {/* Contact card */}
          <div
            className="flex items-start gap-4 p-6 rounded-2xl mb-8"
            style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.2)" }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(108,99,255,0.12)" }}>
              <Mail size={19} style={{ color: "#6C63FF" }} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#F5F7FA] mb-1">Email support</h2>
              <p className="text-[13.5px] text-[#8B95A7] mb-3 leading-relaxed">
                For any question — billing, technical issues, feature requests, or general help.
                Send us a message and we&apos;ll reply within one business day.
              </p>
              <a
                href="mailto:hello@messaivo.com"
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#6C63FF] hover:underline underline-offset-2"
              >
                hello@messaivo.com
              </a>
              <p className="text-[12px] text-[#8B95A7]/60 mt-2 flex items-center gap-1.5">
                <Clock size={11} />
                Response time: within 1 business day
              </p>
            </div>
          </div>

          {/* Common topics */}
          <div className="mb-12">
            <h2 className="text-[16px] font-semibold text-[#F5F7FA] mb-4">Common support topics</h2>
            <div className="flex flex-col gap-3">
              {supportTopics.map((topic) => (
                <div
                  key={topic.title}
                  className="flex items-start gap-4 p-5 rounded-xl"
                  style={{ background: "rgba(16,21,31,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${topic.color}12` }}>
                    <topic.icon size={16} style={{ color: topic.color }} />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-[#F5F7FA] mb-0.5">{topic.title}</h3>
                    <p className="text-[12.5px] text-[#8B95A7]">{topic.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick answers */}
          <div
            className="p-6 rounded-2xl"
            style={{ background: "rgba(16,21,31,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h2 className="text-[15px] font-semibold text-[#F5F7FA] mb-2">Quick answers</h2>
            <p className="text-[13px] text-[#8B95A7] mb-4">
              Many common questions are already answered in our FAQ.
            </p>
            <Link
              href="/#faq"
              className="inline-flex items-center gap-2 text-[13.5px] font-medium text-[#6C63FF] hover:underline underline-offset-2"
            >
              Browse the FAQ →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
