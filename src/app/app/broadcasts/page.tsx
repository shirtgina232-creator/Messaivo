"use client";

import { useState, useEffect } from "react";
import { Plus, Radio, Circle, X, Check, AlertCircle } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

const STATUS_COLORS = {
  draft:     { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
  scheduled: { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
  completed: { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
};

type BroadcastItem = {
  id: string;
  name: string;
  status: string;
  pageId: string | null;
  message: string | null;
  scheduledAt: string | null;
  createdAt: string;
  _count?: { recipients: number };
};

// ── Wizard ────────────────────────────────────────────────────────────────────

function BroadcastWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { pages } = useWorkspace();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [schedDate, setSchedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const selectedPage = pages.find(p => p.id === pageId);

  const handleCreate = async () => {
    if (!name.trim() || !message.trim() || !pageId) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { name, message, pageId };
      if (schedule === "later" && schedDate) body.scheduledAt = schedDate;
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => { onCreated(); onClose(); }, 1200);
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to create broadcast.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>New Broadcast</h2>
            <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>Step {step} of 3</p>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <Check size={22} style={{ color: "#10B981" }} />
            </div>
            <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Broadcast created!</div>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Step 1: Page */}
              {step === 1 && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#8B95A7", opacity: 0.6 }}>Facebook Page</label>
                  {pages.length === 0 ? (
                    <div className="p-4 rounded-xl text-[13px]" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                      No connected pages. Connect a Facebook Page first.
                    </div>
                  ) : pages.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPageId(p.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-all"
                      style={{ background: pageId === p.id ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${pageId === p.id ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: p.color }}>{p.avatar}</div>
                      <span className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{p.name}</span>
                      {pageId === p.id && <Check size={13} style={{ color: "#6C63FF", marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Compose */}
              {step === 2 && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Broadcast Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Weekend Promo"
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Message</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Write your broadcast message..."
                      rows={5}
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                    />
                    <div className="text-right text-[10.5px] mt-1" style={{ color: "#8B95A7" }}>{message.length} / 2000</div>
                  </div>
                </>
              )}

              {/* Step 3: Schedule */}
              {step === 3 && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#8B95A7", opacity: 0.6 }}>When to send</label>
                  <div className="flex flex-col gap-2 mb-4">
                    {(["now", "later"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setSchedule(s)}
                        className="flex items-center gap-3 p-3 rounded-xl text-left"
                        style={{ background: schedule === s ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${schedule === s ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}
                      >
                        <Circle size={8} fill={schedule === s ? "#6C63FF" : "transparent"} style={{ color: schedule === s ? "#6C63FF" : "#8B95A7" }} />
                        <span className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{s === "now" ? "Send immediately" : "Schedule for later"}</span>
                      </button>
                    ))}
                  </div>
                  {schedule === "later" && (
                    <input
                      type="datetime-local"
                      value={schedDate}
                      onChange={e => setSchedDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                    />
                  )}
                  <div className="mt-4 p-3 rounded-xl text-[12.5px]" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)", color: "#8B95A7" }}>
                    Page: <span style={{ color: "#F5F7FA" }}>{selectedPage?.name}</span>
                    <span className="mx-2">·</span>
                    <span style={{ color: "#F5F7FA" }}>{name || "Untitled"}</span>
                  </div>
                  {error && (
                    <div className="mt-3 p-3 rounded-xl flex items-start gap-2 text-[12.5px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                      <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-5">
              {step > 1 && (
                <button
                  onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}
                >
                  Back
                </button>
              )}
              <button
                onClick={() => step < 3 ? setStep(s => (s + 1) as 1 | 2 | 3) : handleCreate()}
                disabled={step === 1 ? !pageId : step === 2 ? !name.trim() || !message.trim() : saving}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                style={{ background: "#6C63FF", opacity: (step === 1 ? !pageId : step === 2 ? !name.trim() || !message.trim() : saving) ? 0.5 : 1 }}
              >
                {step < 3 ? "Continue" : saving ? "Creating…" : "Create Broadcast"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BroadcastsPage() {
  const { pages } = useWorkspace();
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/broadcasts?limit=50")
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcasts?: BroadcastItem[] } | null) => { if (d?.broadcasts) setBroadcasts(d.broadcasts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Broadcasts</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Send bulk messages to your subscribers.</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF" }}
        >
          <Plus size={14} /> New Broadcast
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Radio size={36} style={{ color: "#8B95A7", opacity: 0.25 }} />
          <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No broadcasts yet</div>
          <div className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
            Create your first broadcast to send a message to all your eligible subscribers.
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: "#6C63FF" }}
          >
            <Plus size={14} /> Create Broadcast
          </button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Name", "Page", "Status", "Recipients", "Created", "Scheduled"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "#8B95A7" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b, i) => {
                const sc = STATUS_COLORS[b.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.draft;
                return (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "#F5F7FA" }}>{b.name}</td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{pages.find(p => p.id === b.pageId)?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold capitalize" style={{ background: sc.bg, color: sc.color }}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{(b._count?.recipients ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{fmt(b.createdAt)}</td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{b.scheduledAt ? fmt(b.scheduledAt) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showWizard && <BroadcastWizard onClose={() => setShowWizard(false)} onCreated={load} />}
    </div>
  );
}
