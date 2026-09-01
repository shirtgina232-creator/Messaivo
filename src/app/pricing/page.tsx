import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Messaivo",
  description:
    "Messaivo pricing starts at $19/month for solo operators and scales to $99/month for established businesses. All plans include unified Messenger inbox, audience management, and message templates. Save 20% with annual billing.",
  alternates: { canonical: "https://messaivo.com/pricing" },
};

const comparison = [
  { feature: "Connected Facebook Pages", starter: "1", pro: "Up to 5", business: "Up to 20" },
  { feature: "Messenger inbox", starter: true, pro: true, business: true },
  { feature: "Audience management", starter: true, pro: true, business: true },
  { feature: "Message templates", starter: true, pro: true, business: true },
  { feature: "Analytics", starter: "Basic", pro: "Advanced", business: "Advanced" },
  { feature: "Team members & roles", starter: false, pro: true, business: true },
  { feature: "Permitted broadcasts", starter: false, pro: true, business: true },
  { feature: "Workspace management", starter: false, pro: false, business: true },
  { feature: "Priority support", starter: false, pro: false, business: true },
  { feature: "Secure workspace access", starter: true, pro: true, business: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={14} style={{ color: "#10B981" }} className="mx-auto" />
    ) : (
      <span className="text-[#8B95A7]/30">—</span>
    );
  }
  return <span className="text-[12.5px] text-[#F5F7FA]">{value}</span>;
}

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32">
        {/* Breadcrumb */}
        <nav className="max-w-7xl mx-auto px-6 mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--muted)" }}>
            <li><Link href="/" className="hover:underline underline-offset-2">Home</Link></li>
            <li aria-hidden="true" style={{ opacity: 0.4 }}>›</li>
            <li aria-current="page" style={{ opacity: 0.6 }}>Pricing</li>
          </ol>
        </nav>

        {/* Hero */}
        <div className="max-w-4xl mx-auto px-6 text-center mb-6">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#8B95A7]/50 mb-4">
            Pricing
          </p>
          <h1 className="text-[44px] md:text-[60px] font-semibold tracking-[-0.03em] leading-tight text-[#F5F7FA] mb-4">
            Simple pricing. No surprises.
          </h1>
          <p className="text-[17px] text-[#8B95A7] leading-relaxed max-w-xl mx-auto">
            Three plans for every stage of your business — from solo operators to established teams.
            Upgrade, downgrade, or cancel anytime.
          </p>
        </div>

        <Pricing />

        {/* Comparison table */}
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#F5F7FA] text-center mb-8">
            Compare plans
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Header */}
            <div
              className="grid grid-cols-4 text-center px-4 py-4 border-b"
              style={{ background: "rgba(16,21,31,0.8)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="text-left text-[12px] font-semibold text-[#8B95A7]">Feature</div>
              {["Starter", "Professional", "Business"].map((p) => (
                <div key={p} className="text-[12px] font-semibold text-[#F5F7FA]">{p}</div>
              ))}
            </div>
            {comparison.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-4 items-center text-center px-4 py-3 border-b ${
                  i % 2 === 0 ? "" : "bg-[rgba(255,255,255,0.01)]"
                }`}
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div className="text-left text-[13px] text-[#8B95A7]">{row.feature}</div>
                <div className="flex justify-center"><Cell value={row.starter} /></div>
                <div className="flex justify-center"><Cell value={row.pro} /></div>
                <div className="flex justify-center"><Cell value={row.business} /></div>
              </div>
            ))}
          </div>
        </div>

        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
