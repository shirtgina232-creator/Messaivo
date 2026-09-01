import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import FeaturesSection from "@/components/FeaturesSection";
import UseCases from "@/components/UseCases";
import ProductDemo from "@/components/ProductDemo";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Features — Messaivo",
  description:
    "Explore Messaivo's full feature set: unified Messenger inbox across multiple Facebook Pages, audience management and contact organization, reusable message templates with variables, permitted broadcasts, team roles, and conversation analytics.",
  alternates: { canonical: "https://messaivo.com/features" },
};

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32">
        {/* Breadcrumb */}
        <nav className="max-w-7xl mx-auto px-6 mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--muted)" }}>
            <li><Link href="/" className="hover:underline underline-offset-2">Home</Link></li>
            <li aria-hidden="true" style={{ opacity: 0.4 }}>›</li>
            <li aria-current="page" style={{ opacity: 0.6 }}>Features</li>
          </ol>
        </nav>

        {/* Hero */}
        <div className="max-w-4xl mx-auto px-6 text-center mb-4">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#8B95A7]/50 mb-4">
            Features
          </p>
          <h1 className="text-[44px] md:text-[60px] font-semibold tracking-[-0.03em] leading-tight text-[#F5F7FA] mb-5">
            Everything you need to manage Facebook Messenger at scale.
          </h1>
          <p className="text-[17px] text-[#8B95A7] leading-relaxed max-w-2xl mx-auto mb-6">
            Messaivo gives your team a unified inbox for Messenger, organized contacts, reusable templates,
            compliant broadcast tools, and the analytics to improve over time — all without switching between apps.
          </p>

          {/* Feature quick-nav */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {[
              { label: "Inbox",      href: "#features" },
              { label: "Audience",   href: "#features" },
              { label: "Templates",  href: "#features" },
              { label: "Broadcasts", href: "#features" },
              { label: "Team",       href: "#features" },
              { label: "Demo",       href: "#demo"     },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: "rgba(108,99,255,0.08)",
                  border: "1px solid rgba(108,99,255,0.18)",
                  color: "#8B85FF",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <FeaturesSection />
        <UseCases />
        <ProductDemo />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
