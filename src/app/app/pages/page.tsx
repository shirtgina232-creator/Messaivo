"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Settings, X, Check, ArrowRight, Wifi, WifiOff, Users, MessageSquare, Zap, RefreshCw, Globe } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { DEMO_PAGES } from "@/lib/demo-data";

// All possible pages (connected + available to connect)
const ALL_DEMO_PAGES = [
  ...DEMO_PAGES,
  { id: "p4", name: "Pro Gamers Hub",    avatar: "PG", color: "#F59E0B", followers: 3100, messages: 0, audience: 0, lastSynced: "Never", status: "disconnected" as const },
  { id: "p5", name: "Winners Circle",    avatar: "WC", color: "#EC4899", followers: 1850, messages: 0, audience: 0, lastSynced: "Never", status: "disconnected" as const },
  { id: "p6", name: "Jackpot Arena",     avatar: "JA", color: "#14B8A6", followers: 2400, messages: 0, audience: 0, lastSynced: "Never", status: "disconnected" as const },
];

// ── Plan limit modal ──────────────────────────────────────────────────────────

function PlanLimitModal({ onClose }: { onClose: () => void }) {
  const { plan } = useWorkspace();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#0A111B", border: "1px solid rgba(239,68,68,0.25)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Page Limit Reached</h2>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
        </div>
        <div className="px-6 py-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
            <WifiOff size={20} style={{ color: "#EF4444" }} />
          </div>
          <div className="text-[14px] font-semibold mb-2" style={{ color: "#F5F7FA" }}>
            Your {plan.name} plan supports up to {plan.pageLimit} connected Page{plan.pageLimit > 1 ? "s" : ""}.
          </div>
          <div className="text-[13px] mb-5" style={{ color: "#8B95A7" }}>
            Upgrade your plan to connect more Facebook Pages and manage a larger audience.
          </div>
          <div className="flex gap-3">
            <Link href="/app/billing" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }} onClick={onClose}>
              Upgrade Plan <ArrowRight size={13} />
            </Link>
            <Link href="/app/billing" className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }} onClick={onClose}>
              View Plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Connect Page modal ────────────────────────────────────────────────────────

function ConnectPageModal({ onClose }: { onClose: () => void }) {
  const { connectedPageIds, connectPage, plan } = useWorkspace();
  const [step, setStep] = useState<"info" | "select" | "done">("info");
  const [selected, setSelected] = useState<string[]>([]);
  const [limitHit, setLimitHit] = useState(false);

  const availablePages = ALL_DEMO_PAGES.filter(p => !connectedPageIds.includes(p.id));
  const canConnect = (count: number) => connectedPageIds.length + count <= plan.pageLimit;

  const togglePage = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (!canConnect(prev.length + 1)) { setLimitHit(true); setTimeout(() => setLimitHit(false), 3000); return prev; }
      return [...prev, id];
    });
  };

  const handleConnect = () => {
    selected.forEach(id => connectPage(id));
    setStep("done");
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Connect another Facebook Page</h2>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
        </div>

        {step === "info" && (
          <div className="px-6 py-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(108,99,255,0.12)" }}>
              <Globe size={20} style={{ color: "#6C63FF" }} />
            </div>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: "#F5F7FA" }}>Connect another Facebook Page</h3>
            <p className="text-[13px] mb-5 leading-relaxed" style={{ color: "#8B95A7" }}>
              Connect another Page from your Facebook account to manage its customer conversations and audience in Messaivo.
            </p>
            <div className="p-3 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>
                <span style={{ color: "#F5F7FA", fontWeight: 600 }}>Plan: {plan.name}</span> · {connectedPageIds.length}/{plan.pageLimit} Pages connected
              </div>
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13.5px] font-semibold text-white"
              style={{ background: "#1877F2" }}
              onClick={() => setStep("select")}
            >
              <Globe size={16} /> Continue with Facebook
            </button>
          </div>
        )}

        {step === "select" && (
          <>
            <div className="px-6 py-4">
              <p className="text-[13px] mb-4" style={{ color: "#8B95A7" }}>
                Select a Page from your Facebook account to connect:
              </p>
              {limitHit && (
                <div className="mb-3 p-2.5 rounded-lg text-[12px]" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                  Page limit reached ({plan.pageLimit} max on {plan.name}). Upgrade to connect more.
                </div>
              )}
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {availablePages.length === 0 ? (
                  <div className="text-center py-6 text-[13px]" style={{ color: "#8B95A7" }}>All demo pages are already connected.</div>
                ) : (
                  availablePages.map(page => (
                    <button
                      key={page.id}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: selected.includes(page.id) ? `${page.color}10` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selected.includes(page.id) ? `${page.color}35` : "rgba(255,255,255,0.07)"}`,
                      }}
                      onClick={() => togglePage(page.id)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: page.color }}>{page.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{page.name}</div>
                        <div className="text-[11px]" style={{ color: "#8B95A7" }}>{page.followers.toLocaleString()} followers</div>
                      </div>
                      <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: selected.includes(page.id) ? page.color : "rgba(255,255,255,0.06)" }}>
                        {selected.includes(page.id) && <Check size={11} style={{ color: "#fff" }} />}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <button className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }} onClick={() => setStep("info")}>Back</button>
              <button
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ background: "#6C63FF" }}
                disabled={selected.length === 0}
                onClick={handleConnect}
              >
                Connect {selected.length > 0 ? `${selected.length} Page${selected.length > 1 ? "s" : ""}` : "selected Pages"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <Check size={22} style={{ color: "#10B981" }} />
            </div>
            <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>
              Page{selected.length > 1 ? "s" : ""} connected successfully!
            </div>
            <div className="text-[12.5px] text-center px-4" style={{ color: "#8B95A7" }}>
              This is a demo — no actual Meta API connection was made.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page Card ─────────────────────────────────────────────────────────────────

function PageCard({ page, onDisconnect }: { page: typeof ALL_DEMO_PAGES[0]; onDisconnect: () => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="p-5 rounded-2xl flex flex-col gap-4 group" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: page.color }}>{page.avatar}</div>
          <div>
            <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>{page.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
              <span className="text-[11px]" style={{ color: "#10B981" }}>Connected</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7" }}
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <Settings size={13} />
          </button>
          {settingsOpen && (
            <div className="absolute top-9 right-0 w-40 rounded-xl shadow-xl z-20 overflow-hidden py-1" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-[rgba(255,255,255,0.04)]" style={{ color: "#8B95A7" }}>
                <RefreshCw size={12} /> Sync now
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-[rgba(255,255,255,0.04)]" style={{ color: "#8B95A7" }}>
                <Settings size={12} /> Page settings
              </button>
              <div className="border-t my-1" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
              <button className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-[rgba(255,255,255,0.04)]" style={{ color: "#EF4444" }} onClick={() => { onDisconnect(); setSettingsOpen(false); }}>
                <WifiOff size={12} /> Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: "Audience",  value: page.audience.toLocaleString(), color: "#6C63FF" },
          { icon: MessageSquare, label: "Messages", value: page.messages.toLocaleString(), color: "#22D3EE" },
          { icon: Zap, label: "Credits", value: "—", color: "#F59E0B" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="p-2.5 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Icon size={13} style={{ color, margin: "0 auto 4px" }} />
            <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{value}</div>
            <div className="text-[10px]" style={{ color: "#8B95A7" }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t text-[11px]" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span style={{ color: "#8B95A7" }}>Synced {page.lastSynced}</span>
        <span style={{ color: page.followers > 0 ? "#8B95A7" : "#8B95A7" }}>{page.followers.toLocaleString()} followers</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PagesPage() {
  const { connectedPageIds, disconnectPage, plan } = useWorkspace();
  const [connectOpen, setConnectOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);

  const connectedPages = ALL_DEMO_PAGES.filter(p => connectedPageIds.includes(p.id));
  const atLimit = connectedPageIds.length >= plan.pageLimit;

  const handleAddPage = () => {
    if (atLimit) setLimitOpen(true);
    else setConnectOpen(true);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Connected Pages</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>
            {connectedPageIds.length}/{plan.pageLimit} Pages connected · {plan.name} plan
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{
            background: atLimit ? "rgba(239,68,68,0.15)" : "#6C63FF",
            border: atLimit ? "1px solid rgba(239,68,68,0.3)" : "none",
            color: atLimit ? "#EF4444" : "#fff",
            boxShadow: atLimit ? "none" : "0 0 20px rgba(108,99,255,0.25)",
          }}
          onClick={handleAddPage}
        >
          <Plus size={15} /> Add another Page
        </button>
      </div>

      {/* Plan slot bar */}
      <div className="p-4 rounded-xl mb-6 flex items-center gap-4" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex-1">
          <div className="flex justify-between text-[12px] mb-1.5" style={{ color: "#8B95A7" }}>
            <span>Page slots used</span>
            <span style={{ color: "#F5F7FA", fontWeight: 600 }}>{connectedPageIds.length} / {plan.pageLimit}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((connectedPageIds.length / plan.pageLimit) * 100, 100)}%`, background: atLimit ? "#EF4444" : "#6C63FF" }} />
          </div>
        </div>
        {atLimit ? (
          <Link href="/app/billing" className="text-[12px] font-semibold flex items-center gap-1 shrink-0" style={{ color: "#6C63FF" }}>
            Upgrade <ArrowRight size={12} />
          </Link>
        ) : (
          <span className="text-[12px] shrink-0" style={{ color: "#8B95A7" }}>{plan.pageLimit - connectedPageIds.length} slot{plan.pageLimit - connectedPageIds.length !== 1 ? "s" : ""} available</span>
        )}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {connectedPages.map(page => (
          <PageCard key={page.id} page={page} onDisconnect={() => disconnectPage(page.id)} />
        ))}

        {/* Add card */}
        <button
          className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed min-h-[200px] transition-all"
          style={{
            borderColor: atLimit ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)",
            color: atLimit ? "#EF4444" : "#8B95A7",
          }}
          onClick={handleAddPage}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: atLimit ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)" }}>
            {atLimit ? <WifiOff size={18} /> : <Plus size={18} />}
          </div>
          <div className="text-center">
            <div className="text-[13.5px] font-semibold">{atLimit ? "Page limit reached" : "Connect a Page"}</div>
            {atLimit && <div className="text-[11.5px] mt-1" style={{ color: "#8B95A7" }}>Upgrade to add more Pages</div>}
          </div>
        </button>
      </div>

      {connectOpen && <ConnectPageModal onClose={() => setConnectOpen(false)} />}
      {limitOpen && <PlanLimitModal onClose={() => setLimitOpen(false)} />}
    </div>
  );
}
