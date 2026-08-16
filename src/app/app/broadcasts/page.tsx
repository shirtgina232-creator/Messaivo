"use client";

import { useState } from "react";
import { Plus, Radio, Circle, ChevronRight, X, AlertCircle, Check } from "lucide-react";
import { DEMO_BROADCASTS, DEMO_PAGES, DEMO_CUSTOMERS, type Broadcast } from "@/lib/demo-data";
import { useWorkspace } from "@/lib/workspace-context";
import { CREDIT_COSTS } from "@/lib/credit-costs";

const STATUS_COLORS = {
  draft:     { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
  scheduled: { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
  completed: { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
};

type WizardStep = 1 | 2 | 3 | 4;

function BroadcastWizard({ onClose, onSave, initialPageId, connectedPageIds }: { onClose: () => void; onSave: (b: Broadcast) => void; initialPageId: string | null; connectedPageIds: string[] }) {
  const { consumeCredits } = useWorkspace();
  const [step, setStep] = useState<WizardStep>(1);
  const [pageId, setPageId] = useState(initialPageId ?? "");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("now");
  const [schedDate, setSchedDate] = useState("");
  const [saved, setSaved] = useState(false);

  const availablePages = DEMO_PAGES.filter(p => connectedPageIds.includes(p.id));
  const selectedPage = DEMO_PAGES.find(p => p.id === pageId);
  const eligible = DEMO_CUSTOMERS.filter(c => c.pageId === pageId && c.status === "eligible").length;

  const titles = ["Select Page", "Compose Message", "Review & Schedule", "Confirm"];

  const handleSave = () => {
    const newB: Broadcast = {
      id: `b_${Date.now()}`,
      name: name || `New Broadcast`,
      pageId: pageId,
      pageName: selectedPage?.name ?? "",
      status: schedule === "now" ? "completed" : "scheduled",
      audience: eligible,
      sent: schedule === "now" ? eligible : 0,
      opened: schedule === "now" ? Math.floor(eligible * 0.61) : 0,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      scheduledAt: schedDate || undefined,
    };
    if (schedule === "now") {
      consumeCredits(eligible * CREDIT_COSTS.SEND_BROADCAST_MESSAGE, "SEND_BROADCAST_MESSAGE", pageId);
    }
    setSaved(true);
    setTimeout(() => { onSave(newB); onClose(); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>New Broadcast</h2>
            <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>Step {step} of 3 — {titles[step - 1]}</p>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
        </div>

        {/* Step progress */}
        <div className="flex items-center px-6 py-3 border-b gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  background: step > s ? "#10B981" : step === s ? "#6C63FF" : "rgba(255,255,255,0.06)",
                  color: step >= s ? "#fff" : "#8B95A7",
                }}
              >
                {step > s ? <Check size={11} /> : s}
              </div>
              {s < 3 && <div className="flex-1 h-px" style={{ background: step > s ? "#10B981" : "rgba(255,255,255,0.08)" }} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[280px]">
          {saved ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                <Check size={22} style={{ color: "#10B981" }} />
              </div>
              <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Broadcast {schedule === "now" ? "sent" : "scheduled"}!</div>
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>Your broadcast has been {schedule === "now" ? "sent to" : "scheduled for"} {eligible} recipients.</div>
            </div>
          ) : step === 1 ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11.5px] font-medium block mb-2" style={{ color: "#8B95A7" }}>Broadcast name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Weekend Promotion"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                />
              </div>
              <div>
                <label className="text-[11.5px] font-medium block mb-2" style={{ color: "#8B95A7" }}>Select Page</label>
                <div className="flex flex-col gap-2">
                  {availablePages.map(p => (
                    <button
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: pageId === p.id ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${pageId === p.id ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}`,
                      }}
                      onClick={() => setPageId(p.id)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: p.color }}>{p.avatar}</div>
                      <div>
                        <div className="text-[12.5px] font-semibold" style={{ color: "#F5F7FA" }}>{p.name}</div>
                        <div className="text-[11px]" style={{ color: "#8B95A7" }}>{p.audience.toLocaleString()} audience</div>
                      </div>
                      {pageId === p.id && <Check size={14} className="ml-auto" style={{ color: "#6C63FF" }} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="flex flex-col gap-4">
              {selectedPage && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: selectedPage.color }}>{selectedPage.avatar}</div>
                  <div>
                    <div className="text-[12px] font-semibold" style={{ color: "#F5F7FA" }}>{selectedPage.name}</div>
                    <div className="text-[10.5px]" style={{ color: "#8B95A7" }}>{eligible} eligible recipients</div>
                  </div>
                </div>
              )}
              <div>
                <label className="text-[11.5px] font-medium block mb-2" style={{ color: "#8B95A7" }}>Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Hi {{first_name}}, we have something exciting to share with you…"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["{{first_name}}", "{{page_name}}"].map(v => (
                    <button
                      key={v}
                      className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
                      style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}
                      onClick={() => setMessage(prev => prev + v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <AlertCircle size={13} style={{ color: "#F59E0B", marginTop: 1 }} className="shrink-0" />
                <p className="text-[11px]" style={{ color: "#8B95A7" }}>Messaging availability and recipient eligibility depend on platform rules and applicable permissions.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div><span style={{ color: "#8B95A7" }}>Name:</span> <span style={{ color: "#F5F7FA" }}>{name || "Unnamed broadcast"}</span></div>
                  <div><span style={{ color: "#8B95A7" }}>Page:</span> <span style={{ color: "#F5F7FA" }}>{selectedPage?.name}</span></div>
                  <div><span style={{ color: "#8B95A7" }}>Eligible:</span> <span style={{ color: "#F5F7FA" }}>{eligible}</span></div>
                  <div><span style={{ color: "#8B95A7" }}>Characters:</span> <span style={{ color: "#F5F7FA" }}>{message.length}</span></div>
                </div>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="text-[11px] mb-1.5" style={{ color: "#8B95A7" }}>Preview:</div>
                  <div className="text-[12px]" style={{ color: "#F5F7FA" }}>{message.replace("{{first_name}}", "Sarah").replace("{{page_name}}", selectedPage?.name ?? "")}</div>
                </div>
              </div>
              <div>
                <label className="text-[11.5px] font-medium block mb-2" style={{ color: "#8B95A7" }}>Schedule</label>
                <div className="flex gap-2">
                  {[["now", "Send now"], ["later", "Schedule for later"]].map(([v, l]) => (
                    <button
                      key={v}
                      className="flex-1 py-2 rounded-lg text-[12px] font-medium transition-all"
                      style={{ background: schedule === v ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${schedule === v ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}`, color: schedule === v ? "#8B85FF" : "#8B95A7" }}
                      onClick={() => setSchedule(v)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {schedule === "later" && (
                  <input
                    type="datetime-local"
                    value={schedDate}
                    onChange={e => setSchedDate(e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-lg text-[12.5px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <button
              className="text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
              onClick={() => step > 1 ? setStep((step - 1) as WizardStep) : onClose()}
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
            <button
              className="text-[13px] font-semibold px-5 py-2 rounded-lg text-white transition-all disabled:opacity-40"
              style={{ background: "#6C63FF" }}
              disabled={step === 1 && (!pageId || !name)}
              onClick={() => step < 3 ? setStep((step + 1) as WizardStep) : handleSave()}
            >
              {step < 3 ? "Continue" : schedule === "now" ? "Send broadcast" : "Schedule"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BroadcastsPage() {
  const { selectedPageId, connectedPageIds } = useWorkspace();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(DEMO_BROADCASTS);
  const [wizardOpen, setWizardOpen] = useState(false);

  const totalSent = broadcasts.reduce((sum, b) => sum + b.sent, 0);
  const totalOpened = broadcasts.reduce((sum, b) => sum + b.opened, 0);
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Broadcasts</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Send targeted messages to eligible audience segments.</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
          style={{ background: "#6C63FF", boxShadow: "0 0 20px rgba(108,99,255,0.25)" }}
          onClick={() => setWizardOpen(true)}
        >
          <Plus size={15} /> Create Broadcast
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total broadcasts", value: broadcasts.length },
          { label: "Total sent", value: totalSent.toLocaleString() },
          { label: "Avg open rate", value: `${openRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[22px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>{value}</div>
            <div className="text-[12px]" style={{ color: "#8B95A7" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Policy note */}
      <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
        <AlertCircle size={15} style={{ color: "#F59E0B", marginTop: 1 }} className="shrink-0" />
        <p className="text-[12.5px]" style={{ color: "#8B95A7" }}>
          <span style={{ color: "#F5F7FA", fontWeight: 600 }}>Important:</span> Messaging availability and recipient eligibility depend on platform rules and applicable permissions. Only eligible customers who have interacted within the allowed window can receive broadcasts.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          {["Name", "Page", "Audience", "Status", "Sent", "Created"].map(h => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7", opacity: 0.6 }}>{h}</span>
          ))}
        </div>

        {broadcasts.map(b => (
          <div
            key={b.id}
            className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 border-b items-center transition-colors hover:bg-[rgba(255,255,255,0.02)]"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(108,99,255,0.12)" }}>
                <Radio size={13} style={{ color: "#6C63FF" }} />
              </div>
              <span className="text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>{b.name}</span>
            </div>
            <span className="text-[12px] truncate" style={{ color: "#8B95A7" }}>{b.pageName}</span>
            <span className="text-[12px]" style={{ color: "#F5F7FA" }}>{b.audience > 0 ? b.audience.toLocaleString() : "—"}</span>
            <div>
              <span className="text-[10.5px] font-medium px-2 py-1 rounded-full capitalize" style={{ background: STATUS_COLORS[b.status].bg, color: STATUS_COLORS[b.status].color }}>
                {b.status}
              </span>
            </div>
            <span className="text-[12px]" style={{ color: "#F5F7FA" }}>{b.sent > 0 ? b.sent.toLocaleString() : "—"}</span>
            <span className="text-[12px]" style={{ color: "#8B95A7" }}>{b.createdAt}</span>
          </div>
        ))}
      </div>

      {wizardOpen && <BroadcastWizard onClose={() => setWizardOpen(false)} onSave={b => setBroadcasts(prev => [b, ...prev])} initialPageId={selectedPageId} connectedPageIds={connectedPageIds} />}
    </div>
  );
}
