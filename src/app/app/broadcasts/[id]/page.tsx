"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Clock, AlertCircle, X, Loader2,
  Send, Calendar, MessageSquare, Users, StopCircle, FileText,
  TrendingUp, Eye, CornerDownRight, Ban,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type BroadcastStatus = "draft" | "scheduled" | "sending" | "completed" | "failed" | "cancelled";

interface BroadcastDetail {
  id: string;
  name: string;
  status: BroadcastStatus;
  pageId: string | null;
  templateName: string | null;
  message: string | null;
  scheduledAt: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  ineligibleCount: number;
  skippedCount: number;
  creditsUsed: number;
  messagingTag: string | null;
  allowSubscriberSend: boolean;
}

interface ProgressData {
  status: string;
  total: number;
  sent: number;
  failed: number;
  ineligible: number;
  skipped: number;
  creditsUsed: number;
  processed: number;
  percentComplete: number;
  estimatedSecondsLeft: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null, withTime = true) {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function fmtSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; desc: string }> = {
  draft:     { label: "Draft",     color: "#8B95A7", bg: "rgba(139,149,167,0.08)", border: "rgba(139,149,167,0.2)", icon: <FileText size={16} />,     desc: "This broadcast has not been sent yet." },
  scheduled: { label: "Scheduled", color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  icon: <Calendar size={16} />,     desc: "Broadcast is scheduled and will be sent at the specified time." },
  sending:   { label: "Sending",   color: "#8B85FF", bg: "rgba(108,99,255,0.08)", border: "rgba(108,99,255,0.25)", icon: <Loader2 size={16} className="animate-spin" />, desc: "Broadcast is currently being sent to recipients." },
  completed: { label: "Completed", color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", icon: <CheckCircle2 size={16} />, desc: "Broadcast finished successfully." },
  failed:    { label: "Failed",    color: "#EF4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  icon: <AlertCircle size={16} />,  desc: "Broadcast encountered an error and could not complete." },
  cancelled: { label: "Cancelled", color: "#8B95A7", bg: "rgba(139,149,167,0.08)", border: "rgba(139,149,167,0.2)", icon: <Ban size={16} />,          desc: "Broadcast was cancelled. Already delivered messages were not affected." },
};

// ── Donut Progress Chart ────────────────────────────────────────────────────────

function DonutChart({ pct, color, size = 120, stroke = 10 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      <text x={size / 2} y={size / 2 + 2} textAnchor="middle" dominantBaseline="middle"
        fontSize="18" fontWeight="700" fill={color}>{pct}%</text>
      <text x={size / 2} y={size / 2 + 18} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fill="rgba(139,149,167,0.8)">complete</text>
    </svg>
  );
}

// ── Cancel Dialog ──────────────────────────────────────────────────────────────

function CancelDialog({ b, onConfirm, onDismiss, cancelling }: {
  b: BroadcastDetail; onConfirm: () => void; onDismiss: () => void; cancelling: boolean;
}) {
  const delivered = b.sent;
  const remaining = Math.max(0, b.totalRecipients - b.sent - b.failed);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!cancelling ? onDismiss : undefined} />
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0D1520", border: "1px solid rgba(239,68,68,0.25)" }}>
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}>
            <StopCircle size={20} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Cancel Broadcast?</h3>
            <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: "#8B95A7" }}>
              Are you sure you want to cancel <strong style={{ color: "#F5F7FA" }}>&ldquo;{b.name}&rdquo;</strong>?
              Messages already delivered cannot be undone.
            </p>
          </div>
        </div>
        <div className="mx-6 mb-5 rounded-xl p-4 flex gap-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <p className="text-[10.5px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#8B95A7" }}>Already Delivered</p>
            <p className="text-[20px] font-bold" style={{ color: "#10B981" }}>{delivered.toLocaleString()}</p>
            <p className="text-[10.5px]" style={{ color: "#8B95A7" }}>will not be affected</p>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.07)" }} />
          <div>
            <p className="text-[10.5px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#8B95A7" }}>Will Be Stopped</p>
            <p className="text-[20px] font-bold" style={{ color: "#F59E0B" }}>{remaining.toLocaleString()}</p>
            <p className="text-[10.5px]" style={{ color: "#8B95A7" }}>pending messages</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onDismiss} disabled={cancelling}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#F5F7FA" }}>
            Keep Sending
          </button>
          <button onClick={onConfirm} disabled={cancelling}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#EF4444" }}>
            {cancelling ? <><Loader2 size={13} className="animate-spin" /> Cancelling…</> : <><StopCircle size={13} /> Cancel Broadcast</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stat Tile ──────────────────────────────────────────────────────────────────

function StatTile({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{label}</p>
      <p className="text-[24px] font-bold tabular-nums" style={{ color }}>{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[11px]" style={{ color: "rgba(139,149,167,0.7)" }}>{sub}</p>}
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────────

function Timeline({ b }: { b: BroadcastDetail }) {
  type Step = { label: string; time: string | null; done: boolean; color: string; icon: React.ReactNode };
  const steps: Step[] = [
    { label: "Created",   time: b.createdAt,   done: true,             color: "#8B85FF", icon: <MessageSquare size={12} /> },
    { label: "Scheduled", time: b.scheduledAt, done: !!b.scheduledAt,  color: "#F59E0B", icon: <Calendar size={12} /> },
    { label: "Started",   time: b.startedAt,   done: !!b.startedAt,    color: "#8B85FF", icon: <Send size={12} /> },
    {
      label: b.status === "cancelled" ? "Cancelled" : b.status === "failed" ? "Failed" : "Completed",
      time: b.completedAt,
      done: !!b.completedAt,
      color: b.status === "cancelled" ? "#8B95A7" : b.status === "failed" ? "#EF4444" : "#10B981",
      icon: b.status === "cancelled" ? <Ban size={12} /> : b.status === "failed" ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />,
    },
  ];

  return (
    <div className="flex flex-col gap-0">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-start gap-3">
          {/* Dot + line */}
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: s.done ? `${s.color}1A` : "rgba(255,255,255,0.04)", border: `1px solid ${s.done ? s.color : "rgba(255,255,255,0.1)"}`, color: s.done ? s.color : "#8B95A7" }}>
              {s.icon}
            </div>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 my-1" style={{ background: "rgba(255,255,255,0.07)", minHeight: 20 }} />
            )}
          </div>
          {/* Content */}
          <div className="pb-5 min-w-0">
            <p className="text-[13px] font-medium" style={{ color: s.done ? "#F5F7FA" : "#8B95A7" }}>{s.label}</p>
            <p className="text-[11.5px] mt-0.5" style={{ color: "rgba(139,149,167,0.7)" }}>
              {s.time ? fmtDate(s.time) : "—"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BroadcastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [broadcast, setBroadcast] = useState<BroadcastDetail | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cancel state
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Fetch full broadcast details
  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/broadcasts/${id}`);
      if (!res.ok) { setError("Broadcast not found."); return; }
      const d = await res.json() as { broadcast?: BroadcastDetail };
      if (d.broadcast) setBroadcast(d.broadcast);
    } catch { setError("Failed to load broadcast."); }
    finally { setLoading(false); }
  }, [id]);

  // Fetch live progress
  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/broadcasts/${id}/progress`);
      if (res.ok) {
        const d = await res.json() as ProgressData;
        setProgress(d);
        // Sync status back to broadcast if it changed
        setBroadcast(prev => prev ? { ...prev, status: d.status as BroadcastStatus, sent: d.sent, failed: d.failed } : prev);
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchDetail();
    fetchProgress();
  }, [fetchDetail, fetchProgress]);

  // Auto-refresh progress while sending
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (broadcast?.status === "sending") {
      pollRef.current = setInterval(() => { fetchProgress(); }, 5000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [broadcast?.status, fetchProgress]);

  const handleCancel = useCallback(async () => {
    setCancelling(true); setCancelError("");
    try {
      const res = await fetch(`/api/broadcasts/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setCancelError(d.error ?? "Failed to cancel."); return;
      }
      setShowCancel(false);
      fetchDetail();
      fetchProgress();
    } catch { setCancelError("Network error. Please try again."); }
    finally { setCancelling(false); }
  }, [id, fetchDetail, fetchProgress]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080F18" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "#8B85FF" }} />
      </div>
    );
  }

  if (error || !broadcast) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#080F18" }}>
        <AlertCircle size={36} style={{ color: "#EF4444" }} />
        <p style={{ color: "#8B95A7" }}>{error || "Broadcast not found."}</p>
        <button onClick={() => router.push("/app/broadcasts")} className="text-[13px] underline" style={{ color: "#8B85FF" }}>
          Back to Broadcasts
        </button>
      </div>
    );
  }

  const status = (progress?.status ?? broadcast.status) as BroadcastStatus;
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  const total = progress?.total ?? broadcast.totalRecipients;
  const sent = progress?.sent ?? broadcast.sent;
  const failed = progress?.failed ?? broadcast.failed;
  const ineligible = progress?.ineligible ?? broadcast.ineligibleCount;
  const skipped = progress?.skipped ?? broadcast.skippedCount;
  const pct = progress?.percentComplete ?? (total > 0 ? Math.round(((sent + failed) / total) * 100) : 0);
  const remaining = Math.max(0, total - sent - failed);
  const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;
  const CARD = { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" };

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-5xl mx-auto" style={{ background: "#080F18", color: "#F5F7FA" }}>

      {/* Back + header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push("/app/broadcasts")}
            className="mt-1 p-1.5 rounded-lg hover:bg-white/5 shrink-0" style={{ color: "#8B95A7" }}>
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-[20px] font-semibold leading-snug" style={{ color: "#F5F7FA" }}>{broadcast.name}</h1>
            {broadcast.templateName && (
              <p className="text-[12px] mt-0.5" style={{ color: "#8B95A7" }}>{broadcast.templateName}</p>
            )}
          </div>
        </div>
        {status === "sending" && (
          <button onClick={() => setShowCancel(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold shrink-0"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>
            <StopCircle size={14} /> Cancel Broadcast
          </button>
        )}
      </div>

      {/* Status banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl mb-6"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
        <div style={{ color: cfg.color }}>{cfg.icon}</div>
        <div>
          <p className="text-[14px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="text-[12px]" style={{ color: "rgba(139,149,167,0.85)" }}>{cfg.desc}</p>
        </div>
        {status === "sending" && progress?.estimatedSecondsLeft != null && (
          <p className="ml-auto text-[12px]" style={{ color: "#8B95A7" }}>
            ~{fmtSeconds(progress.estimatedSecondsLeft)} remaining
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT COLUMN — progress + analytics */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Live Progress */}
          <div className="rounded-xl p-5" style={CARD}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: "#8B95A7" }}>
              Live Progress {status === "sending" && <span className="ml-2 inline-flex items-center gap-1 text-[10px]" style={{ color: "#8B85FF" }}><Loader2 size={9} className="animate-spin" /> Live</span>}
            </p>
            <div className="flex items-center gap-8">
              <DonutChart
                pct={pct}
                color={status === "completed" ? "#10B981" : status === "failed" ? "#EF4444" : status === "cancelled" ? "#8B95A7" : "#8B85FF"}
              />
              <div className="grid grid-cols-2 gap-3 flex-1">
                {[
                  { label: "Total",     value: total,      color: "#F5F7FA" },
                  { label: "Delivered", value: sent,       color: "#10B981" },
                  { label: "Failed",    value: failed,     color: "#EF4444" },
                  { label: "Remaining", value: remaining,  color: "#F59E0B" },
                  { label: "Ineligible", value: ineligible, color: "#8B95A7" },
                  { label: "Skipped",   value: skipped,    color: "#8B95A7" },
                ].map(s => (
                  <div key={s.label} className="flex flex-col gap-0.5">
                    <p className="text-[10.5px] font-medium" style={{ color: "#8B95A7" }}>{s.label}</p>
                    <p className="text-[17px] font-bold tabular-nums" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px]" style={{ color: "#8B95A7" }}>Page deliverability rate: {deliveryRate}%</p>
                <p className="text-[11px]" style={{ color: "#8B95A7" }}>{sent.toLocaleString()} / {total.toLocaleString()}</p>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: status === "completed" ? "#10B981" : status === "failed" ? "#EF4444" : status === "cancelled" ? "#8B95A7" : "#8B85FF" }} />
              </div>
            </div>
          </div>

          {/* Message Analytics */}
          <div className="rounded-xl p-5" style={CARD}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: "#8B95A7" }}>Message Analytics</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Delivered",    value: sent,                 color: "#10B981", icon: <Send size={14} /> },
                { label: "Read / Opened", value: broadcast.read ?? 0, color: "#8B85FF", icon: <Eye size={14} /> },
                { label: "Replied",       value: 0,                   color: "#F59E0B", icon: <CornerDownRight size={14} /> },
                { label: "Failed",        value: failed,              color: "#EF4444", icon: <AlertCircle size={14} /> },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3 flex flex-col gap-2"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-1.5" style={{ color: s.color }}>{s.icon}
                    <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "#8B95A7" }}>{s.label}</span>
                  </div>
                  <p className="text-[22px] font-bold tabular-nums" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
                  {total > 0 && (
                    <p className="text-[10.5px]" style={{ color: "rgba(139,149,167,0.6)" }}>
                      {Math.round((s.value / total) * 100)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message Content */}
          <div className="rounded-xl p-5" style={CARD}>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={13} style={{ color: "#8B95A7" }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Message Content</p>
              {broadcast.messagingTag && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
                  {broadcast.messagingTag}
                </span>
              )}
            </div>
            {broadcast.templateName && (
              <div className="flex items-center gap-1.5 mb-2">
                <FileText size={11} style={{ color: "#8B95A7" }} />
                <span className="text-[11.5px]" style={{ color: "#8B95A7" }}>Template: {broadcast.templateName}</span>
              </div>
            )}
            {broadcast.messagingTag && (
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={11} style={{ color: "#8B95A7" }} />
                <span className="text-[11.5px]" style={{ color: "#8B95A7" }}>
                  Messaging Type: <strong style={{ color: "#F59E0B" }}>MESSAGE_TAG</strong>
                </span>
              </div>
            )}
            <div className="rounded-lg p-4 whitespace-pre-wrap text-[13px] leading-relaxed"
              style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", color: "#C4CDD8" }}>
              {broadcast.message ?? <span style={{ color: "#8B95A7", fontStyle: "italic" }}>No message content.</span>}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — timeline + meta */}
        <div className="flex flex-col gap-5">

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Total" value={total} color="#F5F7FA" />
            <StatTile label="Delivered" value={sent} color="#10B981" sub={`${deliveryRate}% rate`} />
            <StatTile label="Credits" value={broadcast.creditsUsed} color="#8B85FF" />
            <StatTile label="Failed" value={failed} color="#EF4444" />
          </div>

          {/* Recipients */}
          <div className="rounded-xl p-4" style={CARD}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={13} style={{ color: "#8B95A7" }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Recipients</p>
            </div>
            {[
              ["Sent",         sent,        "#10B981"],
              ["Unreachable",  ineligible,  "#F59E0B"],
              ["Skipped",      skipped,     "#8B95A7"],
              ["Failed",       failed,      "#EF4444"],
              ["Remaining",    remaining,   "#8B85FF"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="flex items-center justify-between py-1.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-[12px]" style={{ color: "#8B95A7" }}>{label}</span>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: color as string }}>{(value as number).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="rounded-xl p-4" style={CARD}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={13} style={{ color: "#8B95A7" }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Timeline</p>
            </div>
            <Timeline b={broadcast} />
          </div>

          {/* Cancel action (also in right column while sending) */}
          {status === "sending" && (
            <button onClick={() => setShowCancel(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
              <StopCircle size={14} /> Cancel Broadcast
            </button>
          )}
        </div>
      </div>

      {/* Cancel error */}
      {cancelError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-[13px]"
          style={{ background: "#1A0A0A", border: "1px solid rgba(239,68,68,0.4)", color: "#EF4444" }}>
          <AlertCircle size={14} /> {cancelError}
          <button onClick={() => setCancelError("")} className="ml-2"><X size={13} /></button>
        </div>
      )}

      {/* Cancel dialog */}
      {showCancel && (
        <CancelDialog
          b={{ ...broadcast, sent, failed }}
          onConfirm={handleCancel}
          onDismiss={() => { setShowCancel(false); setCancelError(""); }}
          cancelling={cancelling}
        />
      )}
    </div>
  );
}
