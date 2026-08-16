"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  MessageSquare,
  Inbox,
  Users,
  FileText,
  RefreshCw,
} from "lucide-react";

const steps = [
  { icon: Globe,        label: "Facebook Page",       description: "Customer sends a message to your page",           color: "#6C63FF", bg: "rgba(108,99,255,0.1)"  },
  { icon: MessageSquare,label: "Customer Message",    description: "Message arrives instantly via Messenger",          color: "#22D3EE", bg: "rgba(34,211,238,0.1)"  },
  { icon: Inbox,        label: "Messaivo Inbox",      description: "Auto-routed to your unified inbox",               color: "#8B85FF", bg: "rgba(139,133,255,0.1)" },
  { icon: Users,        label: "Organize Customer",   description: "Tagged, segmented, and tracked",                  color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  { icon: FileText,     label: "Template / Response", description: "Reply with a template or custom message",          color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  { icon: RefreshCw,    label: "Follow-up",           description: "Scheduled follow-ups and broadcasts",             color: "#EC4899", bg: "rgba(236,72,153,0.1)"  },
];

export default function ProductFlow() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(34,211,238,calc(0.03 * var(--glow-mult))) 0%, transparent 60%)" }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted)", opacity: 0.5 }}>
            How it works
          </p>
          <h2 className="text-[36px] md:text-[52px] font-semibold tracking-[-0.03em] leading-tight max-w-2xl mx-auto" style={{ color: "var(--text)" }}>
            From first message to loyal customer.
          </h2>
          <p className="text-[16px] mt-4 max-w-lg mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
            Messaivo handles the entire customer messaging lifecycle in one connected workspace.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: step list */}
          <div className="flex flex-col gap-2">
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-300 ${
                  activeStep === i ? "scale-[1.01]" : "opacity-60 hover:opacity-80"
                }`}
                style={{
                  background: activeStep === i ? step.bg : "transparent",
                  border: `1px solid ${activeStep === i ? `${step.color}30` : "var(--border)"}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: activeStep === i ? step.bg : "var(--input-bg)",
                    border: `1px solid ${activeStep === i ? step.color + "40" : "var(--border)"}`,
                  }}
                >
                  <step.icon size={15} style={{ color: activeStep === i ? step.color : "var(--muted)" }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold mb-0.5" style={{ color: activeStep === i ? "var(--text)" : "var(--muted)" }}>
                    {step.label}
                  </div>
                  <div className="text-[12px] leading-snug" style={{ color: "var(--muted)" }}>
                    {step.description}
                  </div>
                </div>
                <div
                  className="text-[11px] font-semibold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: activeStep === i ? step.color : "var(--input-bg)",
                    color: activeStep === i ? "#fff" : "var(--muted)",
                  }}
                >
                  {i + 1}
                </div>
              </button>
            ))}
          </div>

          {/* Right: visual */}
          <div className="relative flex justify-center">
            <div
              className="w-full max-w-sm p-6 rounded-2xl"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border-md)",
                boxShadow: "var(--shadow-float)",
              }}
            >
              <div className="flex flex-col items-center gap-0">
                {steps.map((step, i) => (
                  <div key={i} className="flex flex-col items-center w-full">
                    <div
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        activeStep === i ? "scale-[1.02]" : activeStep > i ? "opacity-40" : "opacity-30"
                      }`}
                      style={{
                        background: activeStep === i ? step.bg : "var(--hover)",
                        border: `1px solid ${activeStep === i ? `${step.color}30` : "transparent"}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: activeStep >= i ? step.bg : "var(--input-bg)" }}
                      >
                        <step.icon size={14} style={{ color: activeStep >= i ? step.color : "var(--muted)" }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[12.5px] font-semibold" style={{ color: activeStep >= i ? "var(--text)" : "var(--muted)" }}>
                          {step.label}
                        </div>
                        {activeStep === i && (
                          <div className="text-[10.5px] mt-0.5" style={{ color: "var(--muted)" }}>
                            {step.description}
                          </div>
                        )}
                      </div>
                      {activeStep > i && <span className="text-[10px] text-green-400">✓</span>}
                      {activeStep === i && (
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: step.color }} />
                      )}
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className="w-px h-4 my-0.5 transition-all duration-300"
                        style={{ background: activeStep > i ? step.color : "var(--border-md)" }}
                      />
                    )}
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
