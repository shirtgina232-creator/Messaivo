"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, X, WifiOff, ArrowRight, RefreshCw, Trash2, Check, AlertCircle, Info } from "lucide-react";
import { useWorkspace, derivedPageColor, derivedPageAvatar } from "@/lib/workspace-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type ApiPage = {
  id: string;
  pageId: string;
  pageName: string;
  pageCategory: string | null;
  pageAvatar: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  scanStatus: string | null;
  lastScannedAt: string | null;
};

type ScanStats = {
  conversationsProcessed: number;
  contactsUpserted: number;
  messagesInserted: number;
};

type ScanResult = {
  stats: ScanStats;       // cumulative totals across all batches
  hasMore: boolean;
  nextCursor: string | null;  // non-null only when scan stopped due to an error mid-way
  error: string | null;
};

type ScanProgress = {
  conversations: number;
  messages: number;
};

// ── Error messages ────────────────────────────────────────────────────────────

const ERROR_MSGS: Record<string, string> = {
  not_configured:   "Meta credentials are not configured. Contact your administrator.",
  denied:           "You declined Facebook authorization. No pages were connected.",
  no_pages:         "Your Facebook account doesn't manage any Pages. Create a Facebook Page first, then connect it here.",
  token_error:      "Failed to exchange the Facebook authorization code. Make sure the callback URL is registered in your Meta App's Valid OAuth Redirect URIs, then try again.",
  invalid_state:    "The authorization request expired or was replayed. Please try again.",
  server_error:     "An unexpected server error occurred. Please try again or contact support.",
  invalid_callback: "Invalid callback parameters from Facebook. Please try again.",
  encryption_error: "Token encryption is misconfigured. The META_TOKEN_ENCRYPTION_KEY environment variable must be set to a valid 64-character hex string in Vercel.",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(diff / 3_600_000);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ── Disconnect modal ──────────────────────────────────────────────────────────

function DisconnectModal({ pageName, onConfirm, onClose }: { pageName: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#0A111B", border: "1px solid rgba(239,68,68,0.25)" }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
            <WifiOff size={18} style={{ color: "#EF4444" }} />
          </div>
          <div className="text-[15px] font-semibold mb-2" style={{ color: "#F5F7FA" }}>Disconnect {pageName}?</div>
          <div className="text-[12.5px] mb-5" style={{ color: "#8B95A7" }}>
            This will remove the page from Messaivo. Existing conversations and contacts will be preserved, but new messages won{"'"}t sync.
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>Disconnect</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Plan limit modal ──────────────────────────────────────────────────────────

function PlanLimitModal({ onClose }: { onClose: () => void }) {
  const { plan } = useWorkspace();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#0A111B", border: "1px solid rgba(239,68,68,0.25)" }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
            <WifiOff size={18} style={{ color: "#EF4444" }} />
          </div>
          <div className="text-[14px] font-semibold mb-2" style={{ color: "#F5F7FA" }}>
            Page limit reached — your {plan.name} plan supports up to {plan.pageLimit} page{plan.pageLimit !== 1 ? "s" : ""}.
          </div>
          <div className="text-[12.5px] mb-5" style={{ color: "#8B95A7" }}>Upgrade to connect more Facebook Pages.</div>
          <div className="flex gap-3">
            <Link href="/app/billing" onClick={onClose} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>
              Upgrade <ArrowRight size={13} />
            </Link>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page selection modal (shown after Facebook OAuth) ─────────────────────────

function PageSelectModal({ pendingPages, onDone, onSkip }: { pendingPages: ApiPage[]; onDone: () => void; onSkip: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(pendingPages.map(p => p.id)));
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const confirm = async () => {
    setSaving(true);
    try {
      await Promise.all(pendingPages.map(p =>
        fetch(`/api/pages/${p.id}`, {
          method: selected.has(p.id) ? "PATCH" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: selected.has(p.id) ? JSON.stringify({ isActive: true }) : undefined,
        })
      ));
      onDone();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Select Pages to Connect</h2>
          <p className="text-[12px] mt-0.5" style={{ color: "#8B95A7" }}>
            Found {pendingPages.length} page{pendingPages.length !== 1 ? "s" : ""} your Facebook account manages. Choose which to connect.
          </p>
        </div>

        <div className="px-4 py-3 max-h-72 overflow-y-auto flex flex-col gap-2">
          {pendingPages.map(p => {
            const initials = p.pageName.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2);
            const isChecked = selected.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: isChecked ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isChecked ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}`,
                }}
              >
                {p.pageAvatar ? (
                  <img src={p.pageAvatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>{initials || "FB"}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{p.pageName}</div>
                  {p.pageCategory && <div className="text-[11px]" style={{ color: "#8B95A7" }}>{p.pageCategory}</div>}
                </div>
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                  style={{ background: isChecked ? "#6C63FF" : "rgba(255,255,255,0.06)", border: isChecked ? "none" : "1px solid rgba(255,255,255,0.15)" }}
                >
                  {isChecked && <Check size={11} color="white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <button
            onClick={onSkip}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}
          >
            Skip
          </button>
          <div className="text-[12px] flex-1 self-center text-center" style={{ color: "#8B95A7" }}>
            {selected.size} of {pendingPages.length} selected
          </div>
          <button
            onClick={confirm}
            disabled={selected.size === 0 || saving}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: "#6C63FF", opacity: selected.size === 0 || saving ? 0.5 : 1 }}
          >
            {saving ? "Connecting…" : `Connect ${selected.size > 0 ? selected.size : ""} Page${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PagesPage() {
  const { plan, connectedPageIds, disconnectPage, reloadPages } = useWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();

  const flow     = searchParams.get("flow");
  const errorKey = searchParams.get("error");

  const [allPages, setAllPages]         = useState<ApiPage[]>([]);
  const [loadingAll, setLoadingAll]     = useState(true);
  const [modal, setModal]               = useState<null | "limit" | string>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Scan state
  const [scanningIds, setScanningIds]   = useState<Set<string>>(new Set());
  const [scanResults, setScanResults]   = useState<Record<string, ScanResult>>({});
  const [scanProgress, setScanProgress] = useState<Record<string, ScanProgress>>({});

  // Fetch all pages (active + inactive) — used for both the grid and the select modal
  const fetchAll = useCallback(() => {
    setLoadingAll(true);
    fetch("/api/pages")
      .then(r => r.ok ? r.json() : null)
      .then((d: { pages?: ApiPage[] } | null) => { if (d?.pages) setAllPages(d.pages); })
      .catch(() => {})
      .finally(() => setLoadingAll(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activePages  = allPages.filter(p => p.isActive);
  const pendingPages = allPages.filter(p => !p.isActive);

  const handleSelectDone = () => {
    reloadPages();
    fetchAll();
    router.replace("/app/pages");
  };

  const handleConnectClick = () => {
    if (connectedPageIds.length >= plan.pageLimit) {
      setModal("limit");
    } else {
      window.location.href = "/api/auth/meta";
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnecting) return;
    await fetch(`/api/pages/${disconnecting}`, { method: "DELETE" }).catch(() => {});
    disconnectPage(disconnecting);
    setDisconnecting(null);
    setModal(null);
    fetchAll();
  };

  const handleScan = async (pageId: string, startCursor: string | null = null) => {
    if (scanningIds.has(pageId)) return;
    setScanningIds(prev => new Set(prev).add(pageId));
    // Clear previous result; seed progress from zero (or keep existing totals when resuming from error)
    setScanResults(prev => { const n = { ...prev }; delete n[pageId]; return n; });
    setScanProgress(prev => ({ ...prev, [pageId]: { conversations: 0, messages: 0 } }));

    const totals: ScanStats = { conversationsProcessed: 0, contactsUpserted: 0, messagesInserted: 0 };
    let cursor: string | null = startCursor;

    try {
      while (true) {
        let res: Response;
        try {
          res = await fetch(`/api/pages/${pageId}/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cursor }),
          });
        } catch {
          setScanResults(prev => ({
            ...prev,
            [pageId]: { stats: { ...totals }, hasMore: true, nextCursor: cursor, error: "Network error" },
          }));
          break;
        }

        type BatchResp = { batchStats?: ScanStats; nextCursor?: string | null; hasMore?: boolean; error?: string | null };
        const data = await res.json() as BatchResp;

        if (!res.ok || data.error) {
          setScanResults(prev => ({
            ...prev,
            [pageId]: {
              stats: { ...totals },
              hasMore: true,
              nextCursor: cursor,
              error: data.error ?? `HTTP ${res.status}`,
            },
          }));
          break;
        }

        const batch = data.batchStats ?? { conversationsProcessed: 0, contactsUpserted: 0, messagesInserted: 0 };
        totals.conversationsProcessed += batch.conversationsProcessed;
        totals.contactsUpserted       += batch.contactsUpserted;
        totals.messagesInserted       += batch.messagesInserted;

        // Update live progress display
        setScanProgress(prev => ({
          ...prev,
          [pageId]: { conversations: totals.conversationsProcessed, messages: totals.messagesInserted },
        }));

        if (!data.hasMore) {
          setScanResults(prev => ({
            ...prev,
            [pageId]: { stats: { ...totals }, hasMore: false, nextCursor: null, error: null },
          }));
          fetchAll();
          break;
        }

        cursor = data.nextCursor ?? null;

        // 500 ms pause between batches to avoid hammering Meta's API
        await new Promise(r => setTimeout(r, 500));
      }
    } finally {
      setScanningIds(prev => { const n = new Set(prev); n.delete(pageId); return n; });
    }
  };

  const pageToDisconnect = allPages.find(p => p.id === disconnecting);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Error banner */}
      {errorKey && ERROR_MSGS[errorKey] && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle size={16} style={{ color: "#EF4444", marginTop: 1, flexShrink: 0 }} />
          <div>
            <div className="text-[13px] font-semibold mb-0.5" style={{ color: "#EF4444" }}>Connection failed</div>
            <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>{ERROR_MSGS[errorKey]}</div>
            {errorKey === "not_configured" && (
              <div className="mt-2 text-[12px] font-mono px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>
                Set META_APP_ID and META_APP_SECRET in .env.local
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Facebook Pages</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>
            {activePages.length} of {plan.pageLimit} page{plan.pageLimit !== 1 ? "s" : ""} connected on your {plan.name} plan.
          </p>
        </div>
        <button
          onClick={handleConnectClick}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#1877F2" }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Connect Page
        </button>
      </div>

      {loadingAll && activePages.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl animate-pulse" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)", height: 120 }} />
          ))}
        </div>
      ) : activePages.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(24,119,242,0.1)", border: "1px solid rgba(24,119,242,0.2)" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#1877F2" style={{ opacity: 0.7 }}>
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No pages connected</div>
          <div className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
            Connect a Facebook Page to start receiving Messenger conversations from your audience.
          </div>
          <button
            onClick={handleConnectClick}
            className="mt-1 flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white"
            style={{ background: "#1877F2" }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Connect with Facebook
          </button>
          <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>
            You{"'"}ll be redirected to Facebook to authorize access to your Pages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePages.map(p => {
            const color    = derivedPageColor(p.pageName);
            const avatar   = derivedPageAvatar(p.pageName);
            const scanning = scanningIds.has(p.id);
            const result   = scanResults[p.id];
            const progress = scanProgress[p.id];
            // On error with a saved cursor, clicking the button resumes from that position
            const resumeCursor = (!scanning && result?.error && result.nextCursor != null) ? result.nextCursor : null;

            return (
              <div key={p.id} className="p-4 rounded-xl flex flex-col" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  {p.pageAvatar ? (
                    <img src={p.pageAvatar} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: color }}>{avatar}</div>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleScan(p.id, resumeCursor)}
                      disabled={scanning}
                      className="w-7 h-7 flex items-center justify-center rounded-lg"
                      style={{ background: scanning ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.04)", color: scanning ? "#8B85FF" : resumeCursor ? "#F59E0B" : "#8B95A7" }}
                      title={scanning ? "Scanning…" : resumeCursor ? "Resume scan from last position" : "Scan for existing conversations"}
                    >
                      <RefreshCw size={12} className={scanning ? "animate-spin" : ""} />
                    </button>
                    <button
                      onClick={() => { setDisconnecting(p.id); setModal("disconnect"); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg"
                      style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Page name & status */}
                <div className="text-[14px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>{p.pageName}</div>
                {p.pageCategory && (
                  <div className="text-[11px] mb-1" style={{ color: "#8B95A7" }}>{p.pageCategory}</div>
                )}
                <div className="flex items-center gap-1.5 text-[11.5px] mb-2" style={{ color: "#10B981" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Connected
                </div>

                {/* Scan status row */}
                {scanning ? (
                  <div className="mt-auto pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-[11px]" style={{ color: "#8B85FF" }}>
                      {progress && progress.conversations > 0
                        ? `Scanning… ${progress.conversations} conversation${progress.conversations !== 1 ? "s" : ""} synced`
                        : "Scanning for conversations…"}
                    </span>
                  </div>
                ) : result ? (
                  <div className="mt-auto pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    {result.error ? (
                      <span className="text-[11px]" style={{ color: "#EF4444" }}>
                        {result.nextCursor
                          ? `Scan paused after ${result.stats.conversationsProcessed} conversation${result.stats.conversationsProcessed !== 1 ? "s" : ""} — click `
                          : "Scan error: "}
                        {result.nextCursor
                          ? <><RefreshCw size={9} className="inline" /> to resume</>
                          : result.error}
                      </span>
                    ) : (
                      <span className="text-[11px]" style={{ color: "#10B981" }}>
                        Synced {result.stats.conversationsProcessed} conversation{result.stats.conversationsProcessed !== 1 ? "s" : ""},
                        {" "}{result.stats.messagesInserted} new message{result.stats.messagesInserted !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                ) : p.lastScannedAt ? (
                  <div className="mt-auto pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-[11px]" style={{ color: "#8B95A7" }}>Last scanned {timeAgo(p.lastScannedAt)}</span>
                  </div>
                ) : (
                  <div className="mt-auto pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-[11px]" style={{ color: "#8B95A7" }}>Not yet scanned — click <RefreshCw size={9} className="inline" /> to import history</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending page selection modal (shown after OAuth) */}
      {flow === "select" && !loadingAll && pendingPages.length > 0 && (
        <PageSelectModal pendingPages={pendingPages} onDone={handleSelectDone} onSkip={() => router.replace("/app/pages")} />
      )}

      {/* If flow=select but no pending pages found, clean up the URL */}
      {flow === "select" && !loadingAll && pendingPages.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl p-6 text-center" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Info size={32} style={{ color: "#F59E0B", margin: "0 auto 12px" }} />
            <div className="text-[14px] font-semibold mb-2" style={{ color: "#F5F7FA" }}>No pages found</div>
            <div className="text-[12.5px] mb-4" style={{ color: "#8B95A7" }}>
              No pending pages to connect. Try connecting again from Facebook.
            </div>
            <button onClick={() => router.replace("/app/pages")} className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>
              Got it
            </button>
          </div>
        </div>
      )}

      {modal === "limit" && <PlanLimitModal onClose={() => setModal(null)} />}
      {modal === "disconnect" && pageToDisconnect && (
        <DisconnectModal
          pageName={pageToDisconnect.pageName}
          onConfirm={handleDisconnectConfirm}
          onClose={() => { setModal(null); setDisconnecting(null); }}
        />
      )}
    </div>
  );
}
