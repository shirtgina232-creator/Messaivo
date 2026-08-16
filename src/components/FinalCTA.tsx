"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(108,99,255,calc(0.12 * var(--glow-mult))) 0%, rgba(108,99,255,calc(0.04 * var(--glow-mult))) 40%, transparent 70%)",
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.018,
          backgroundImage: "linear-gradient(var(--grid-stroke) 1px, transparent 1px), linear-gradient(90deg, var(--grid-stroke) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(108,99,255,calc(0.15 * var(--glow-mult))) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      <div className="max-w-4xl mx-auto px-6 text-center relative">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-medium mb-8"
          style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)", color: "#8B85FF" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#6C63FF" }} />
          Start managing your conversations today
        </div>

        <h2
          className="text-[44px] md:text-[64px] lg:text-[72px] font-semibold tracking-[-0.03em] leading-[1.05] mb-6"
          style={{ color: "var(--text)" }}
        >
          Turn conversations into{" "}
          <span className="gradient-text-accent">relationships.</span>
        </h2>

        <p className="text-[18px] md:text-[20px] leading-relaxed max-w-xl mx-auto mb-10" style={{ color: "var(--muted)" }}>
          Bring your customer messaging workflow into one powerful workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#6C63FF] hover:bg-[#5B52E8] text-white font-semibold text-[15px] px-8 py-4 rounded-xl transition-all duration-200 shadow-[0_0_40px_rgba(108,99,255,0.35)] hover:shadow-[0_0_60px_rgba(108,99,255,0.45)] group"
          >
            Start with Messaivo
            <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center gap-2 text-[15px] font-medium transition-colors group"
            style={{ color: "var(--muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
          >
            Explore the platform
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <p className="text-[12px] mt-10" style={{ color: "var(--muted)", opacity: 0.5 }}>
          No credit card required to start · Cancel anytime
        </p>
      </div>
    </section>
  );
}
