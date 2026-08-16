"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import HeroDashboard from "./HeroDashboard";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-0">
      {/* Ambient glow */}
      <div
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(108,99,255,calc(0.12 * var(--glow-mult))) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute top-[200px] left-[10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(34,211,238,calc(0.05 * var(--glow-mult))) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.018,
          backgroundImage: `linear-gradient(var(--grid-stroke) 1px, transparent 1px), linear-gradient(90deg, var(--grid-stroke) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-medium"
            style={{
              background: "rgba(108,99,255,0.10)",
              border: "1px solid rgba(108,99,255,0.22)",
              color: "#8B85FF",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#6C63FF" }} />
            Modern customer messaging, built for businesses
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center max-w-4xl mx-auto mb-6">
          <h1
            className="text-[44px] md:text-[64px] lg:text-[76px] font-semibold tracking-[-0.03em] leading-[1.05]"
            style={{ color: "var(--text)" }}
          >
            Every customer{" "}
            <span className="gradient-text-accent">conversation.</span>
            <br />
            One powerful workspace.
          </h1>
        </div>

        {/* Supporting */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p
            className="text-[16px] md:text-[18px] leading-relaxed font-normal"
            style={{ color: "var(--muted)" }}
          >
            Connect your Facebook Pages, manage conversations, organize your audience,
            and streamline customer messaging from one intelligent workspace.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-white font-semibold text-[14.5px] px-6 py-3.5 rounded-xl transition-all duration-200 group"
            style={{
              background: "#6C63FF",
              boxShadow: "0 0 30px rgba(108,99,255,0.30)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "#5B52E8";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(108,99,255,0.42)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "#6C63FF";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 30px rgba(108,99,255,0.30)";
            }}
          >
            Get started
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-[14.5px] font-medium px-6 py-3.5 rounded-xl transition-all duration-200"
            style={{
              color: "var(--muted)",
              border: "1px solid var(--border-md)",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
          >
            <Play size={14} fill="currentColor" />
            See how it works
          </Link>
        </div>

        {/* Trust */}
        <div className="text-center mb-16">
          <p className="text-[12.5px] font-medium" style={{ color: "var(--muted)", opacity: 0.6 }}>
            Built for teams that care about every customer interaction.
          </p>
        </div>

        {/* Dashboard */}
        <div className="relative">
          <div
            className="absolute -inset-6 rounded-2xl pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 0%, rgba(108,99,255,calc(0.14 * var(--glow-mult))) 0%, transparent 60%)",
              filter: "blur(30px)",
            }}
          />
          {/* Label */}
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium z-10"
            style={{
              background: "var(--card)",
              border: "1px solid rgba(108,99,255,0.3)",
              color: "#6C63FF",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#6C63FF" }} />
            Live workspace preview
          </div>

          <HeroDashboard />

          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, var(--bg) 100%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
