"use client";

import { ArrowDown, MessageCircle, Mail, Phone, Globe } from "lucide-react";

const scattered = [
  { icon: MessageCircle, label: "Facebook Page 1", messages: 47, color: "#6C63FF", pos: "top-0 left-[8%]",    delay: "0s"   },
  { icon: MessageCircle, label: "Facebook Page 2", messages: 23, color: "#22D3EE", pos: "top-4 right-[12%]",  delay: "0.3s" },
  { icon: Mail,          label: "Email threads",   messages: 61, color: "#10B981", pos: "top-[55%] left-[4%]",delay: "0.6s" },
  { icon: Phone,         label: "DM requests",     messages: 18, color: "#F59E0B", pos: "top-[50%] right-[8%]",delay:"0.9s" },
  { icon: Globe,         label: "Website chats",   messages: 34, color: "#EC4899", pos: "top-[28%] left-[2%]",delay: "1.2s" },
];

const problems = [
  "Conversations scattered across multiple platforms",
  "No clear view of who your customers are",
  "Repetitive manual replies slowing your team down",
  "Teams working from different tools with no context",
  "No organized audience segments or follow-up flow",
  "Missed messages and frustrated customers",
];

export default function ProblemSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted)", opacity: 0.6 }}>
            The problem
          </p>
          <h2 className="text-[36px] md:text-[52px] font-semibold tracking-[-0.03em] leading-tight max-w-2xl mx-auto" style={{ color: "var(--text)" }}>
            Customer conversations shouldn&apos;t live everywhere.
          </h2>
          <p className="text-[16px] mt-4 max-w-xl mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
            When your messaging is fragmented, customers wait, teams lose context, and opportunities disappear.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Problem list */}
          <div className="flex flex-col gap-3">
            {problems.map((problem, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(239,68,68,0.12)" }}>
                  <span className="text-[10px] text-red-400">✕</span>
                </div>
                <p className="text-[13.5px] leading-snug" style={{ color: "var(--muted)" }}>{problem}</p>
              </div>
            ))}
          </div>

          {/* Visual */}
          <div className="relative flex flex-col items-center gap-6">
            {/* Scattered */}
            <div className="w-full">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-4 text-center" style={{ color: "var(--muted)", opacity: 0.5 }}>
                Before Messaivo
              </p>
              <div className="relative h-48 flex items-center justify-center">
                {scattered.map((item, i) => (
                  <div
                    key={i}
                    className={`absolute ${item.pos} flex items-center gap-2 px-3 py-2 rounded-lg`}
                    style={{
                      background: "var(--card)",
                      border: `1px solid ${item.color}30`,
                      boxShadow: `0 0 20px ${item.color}10`,
                      animation: `float ${4 + i * 0.5}s ease-in-out infinite`,
                      animationDelay: item.delay,
                    }}
                  >
                    <item.icon size={13} style={{ color: item.color }} />
                    <div>
                      <div className="text-[10px] font-semibold" style={{ color: "var(--text)" }}>{item.label}</div>
                      <div className="text-[9px]" style={{ color: "var(--muted)" }}>{item.messages} unread</div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <span className="text-2xl">😰</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <ArrowDown size={18} style={{ color: "#6C63FF" }} />
              <span className="text-[11px] font-medium" style={{ color: "#6C63FF" }}>With Messaivo</span>
              <ArrowDown size={18} style={{ color: "#6C63FF" }} />
            </div>

            {/* Unified */}
            <div
              className="w-full p-5 rounded-xl"
              style={{
                background: "var(--card)",
                border: "1px solid rgba(108,99,255,0.22)",
                boxShadow: "0 0 40px rgba(108,99,255,calc(0.08 * var(--glow-mult)))",
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--muted)", opacity: 0.5 }}>
                After Messaivo
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(108,99,255,0.15)" }}>
                  <MessageCircle size={15} style={{ color: "#6C63FF" }} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Messaivo Inbox</div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>183 conversations · 2 pages</div>
                </div>
                <div className="ml-auto px-2 py-1 rounded-md text-[10px] font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>All organized</div>
              </div>
              <div className="flex gap-2">
                {["Active", "Waiting", "Resolved"].map((status, i) => (
                  <div key={status} className="flex-1 p-2 rounded-lg text-center" style={{ background: "var(--input-bg)" }}>
                    <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>{[47, 23, 113][i]}</div>
                    <div className="text-[9.5px]" style={{ color: "var(--muted)" }}>{status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
