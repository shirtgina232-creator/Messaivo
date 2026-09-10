"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, AlertCircle,
  Send, Users, UserX, SkipForward, Eye, MessageSquare, Ban,
  RefreshCw, ChevronDown, ChevronRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Broadcast {
  id: string;
  name: string;
  status: string;
  message: string;
  pageId: string | null;
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  ineligibleCount: number;
  skippedCount: number;
  creditsUsed: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  templateName: string | null;
  template: { content: string } | null;
  messageTemplate: { content: string } | null;
}

interface ProgressData {
  status: string;
  total: number;
  sent: number;
  failed: number;
  ineligible: number;
  skipped: number;
  processed: number;
  percentComplete: number;
  estimatedSecondsLeft: number | null;
  job: {
    status: string;
    batchSize: number;
    attemptCount: number;
    lastAttemptAt: string | null;
    scheduledFor: string;
    lastError: string | null;
  } | null;
}

interface Recipient {
  id: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failureReason: string | null;
  contact: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    metaUserId: string;
  };
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:     { label: "Draft",     color: "#8B95A7", bg: "rgba(139,149,167,0.12)", icon: Clock        },
  scheduled: { label: "Scheduled", color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: Clock        },
  sending:   { label: "Running",   color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  icon: Loader2      },
  completed: { label: "Completed", color: "#10B981", bg: "rgba(16,185,129,0.12)",  icon: CheckCircle2 },
  failed:    { label: "Failed",    color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: XCircle      },
  cancelled: { label: "Cancelled", color: "#8B95A7", bg: "rgba(139,149,167,0.12)", icon: Ban          },
};

const RECIPIENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "#8B95A7" },
  sent:      { label: "Sent",      color: "#3B82F6" },
  delivered: { label: "Delivered", color: "#6C63FF" },
  read:      { label: "Read",      color: "#10B981" },
  failed:    { label: "Failed",    color: "#EF4444" },
};

// ── Circular progress ring ─────────────────────────────────────────────────────

function ProgressRing({ pct, size = 160, stroke = 10 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 1));
  const color = pct >= 0.9 ? "#10B981" : pct >= 0.5 ? "#6C63FF" : "#F59E0B";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
      />
    </svg>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[11.5px] font-medium" style={{ color: "#8B95A7" }}>{label}</span>
      </div>
      <span className="text-[26px] font-bold tracking-tight" style={{ color: "#F5F7FA" }}>{typeof value === "number" ? value.toLocaleString() : value}</span>
      {sub && <span className="text-[11px]" style={{ color: "#8B95A7" }}>{sub}</span>}
    </div>
  );
}

// ── Recipient row ──────────────────────────────────────────────────────────────

function RecipientRow({ r }: { r: Recipient }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RECIPIENT_STATUS_CONFIG[r.status] ?? { label: r.status, color: "#8B95A7" };
  const displayName = (r.contact.name ?? [r.contact.firstName, r.contact.lastName].filter(Boolean).join(" ")) || r.contact.metaUserId;

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={() => r.failureReason && setExpanded(!expanded)}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>
          {(displayName[0] ?? "?").toUpperCase()}
        </div>
        <span className="flex-1 text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>{displayName}</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: `${cfg.color}18` }}>
          {cfg.label}
        </span>
        {r.failureReason && (
          <ChevronDown size={13} style={{ color: "#8B95A7", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        )}
      </div>
      {expanded && r.failureReason && (
        <div className="px-14 pb-3">
          <p className="text-[12px] leading-relaxed" style={{ color: "#EF4444" }}>{r.failureReason}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BroadcastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [recipientStats, setRecipientStats] = useState<Record<string, number>>({});
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsFilter, setRecipientsFilter] = useState<string>("all");
  const [recipientsCursor, setRecipientsCursor] = useState<string | null>(null);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBroadcast = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/broadcasts/${id}`);
      if (!res.ok) { setError("Broadcast not found"); return; }
      const data = await res.json();
      setBroadcast(data.broadcast);
      setRecipientStats(data.recipientStats ?? {});
    } catch {
      setError("Failed to load broadcast");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const fetchRecipients = useCallback(async (cursor?: string | null) => {
    setRecipientsLoading(true);
    const qs = new URLSearchParams({ limit: "50" });
    if (cursor) qs.set("cursor", cursor);
    if (recipientsFilter !== "all") qs.set("status", recipientsFilter);
    try {
      const res = await fetch(`/api/broadcasts/${id}/recipients?${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      const list: Recipient[] = data.recipients ?? [];
      setRecipients(prev => cursor ? [...prev, ...list] : list);
      setRecipientsCursor(data.nextCursor ?? null);
    } finally {
      setRecipientsLoading(false);
    }
  }, [id, recipientsFilter]);

  useEffect(() => { fetchBroadcast(); }, [fetchBroadcast]);
  useEffect(() => { setRecipients([]); setRecipientsCursor(null); fetchRecipients(); }, [fetchRecipients]);

  // Poll progress endpoint every 3s while sending; refresh full broadcast every 12s
  useEffect(() => {
    if (broadcast?.status !== "sending") return;

    const pollProgress = async () => {
      try {
        const res = await fetch(`/api/broadcasts/${id}/progress`);
        if (!res.ok) return;
        const data: ProgressData = await res.json();
        setProgress(data);
        // If the job finished, do a full broadcast refresh to update all fields
        if (data.status !== "sending") fetchBroadcast(true);
      } catch { /* ignore */ }
    };

    pollProgress();
    const progressInterval = setInterval(pollProgress, 3000);
    const broadcastInterval = setInterval(() => fetchBroadcast(true), 12000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(broadcastInterval);
    };
  }, [broadcast?.status, id, fetchBroadcast]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "#6C63FF" }} />
      </div>
    );
  }

  if (error || !broadcast) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <AlertCircle size={32} style={{ color: "#EF4444" }} />
        <p style={{ color: "#8B95A7" }}>{error ?? "Broadcast not found"}</p>
        <button onClick={() => router.back()} className="text-[13px] underline" style={{ color: "#6C63FF" }}>Go back</button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[broadcast.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;

  // Delivery rate = sent / totalRecipients (or delivered / sent if available)
  const total = broadcast.totalRecipients || 1;
  const deliveryPct = broadcast.sent / total;
  const deliveryRatePct = broadcast.delivered > 0 && broadcast.sent > 0
    ? (broadcast.delivered / broadcast.sent) * 100
    : broadcast.sent > 0 ? (broadcast.sent / total) * 100 : 0;

  const readPct = broadcast.sent > 0 ? ((broadcast.read / broadcast.sent) * 100).toFixed(1) : "0.0";
  const deliveredPct = broadcast.sent > 0 ? ((broadcast.delivered / broadcast.sent) * 100).toFixed(1) : "0.0";

  // "Other failed" = failed minus window-ineligible minus unsubscribed
  const otherFailed = Math.max(0, broadcast.failed - broadcast.ineligibleCount - broadcast.skippedCount);

  const messageContent = broadcast.messageTemplate?.content ?? broadcast.template?.content ?? broadcast.message;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-[13px] mt-0.5 transition-colors hover:opacity-80"
              style={{ color: "#8B95A7" }}
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-[20px] font-semibold tracking-tight" style={{ color: "#F5F7FA" }}>
                  {broadcast.name}
                </h1>
                <span
                  className="flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: cfg.color, background: cfg.bg }}
                >
                  <StatusIcon size={11} className={broadcast.status === "sending" ? "animate-spin" : ""} />
                  {cfg.label}
                </span>
              </div>
              {broadcast.templateName && (
                <p className="text-[12.5px]" style={{ color: "#8B95A7" }}>
                  Template: {broadcast.templateName}
                </p>
              )}
              <p className="text-[12px] mt-0.5" style={{ color: "#8B95A7", opacity: 0.6 }}>
                Created {new Date(broadcast.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {broadcast.completedAt && (
                  <> · Completed {new Date(broadcast.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchBroadcast(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#8B95A7" }}
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Status banner */}
        {(broadcast.status === "completed" || broadcast.status === "failed" || broadcast.status === "sending") && (
          <div
            className="p-4 rounded-xl mb-6"
            style={{
              background: broadcast.status === "completed" ? "rgba(16,185,129,0.07)" : broadcast.status === "sending" ? "rgba(59,130,246,0.07)" : "rgba(239,68,68,0.07)",
              border: `1px solid ${broadcast.status === "completed" ? "rgba(16,185,129,0.2)" : broadcast.status === "sending" ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                <StatusIcon size={17} style={{ color: cfg.color }} className={broadcast.status === "sending" ? "animate-spin" : ""} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                <p className="text-[12.5px]" style={{ color: "#8B95A7" }}>
                  {broadcast.status === "completed" && "Broadcast finished successfully."}
                  {broadcast.status === "failed" && "Broadcast completed with no successful deliveries."}
                  {broadcast.status === "sending" && (
                    progress
                      ? `Sending batch ${Math.ceil(progress.processed / (progress.job?.batchSize ?? 50))} · ${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()} processed`
                      : "Broadcast is being delivered — first batch processes within 60 seconds…"
                  )}
                </p>
              </div>
              {broadcast.status === "sending" && progress && (
                <div className="text-right shrink-0">
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: "#3B82F6" }}>
                    {progress.percentComplete}%
                  </span>
                  {progress.estimatedSecondsLeft !== null && progress.estimatedSecondsLeft > 0 && (
                    <p className="text-[10.5px]" style={{ color: "#8B95A7" }}>
                      ~{progress.estimatedSecondsLeft < 60
                        ? `${progress.estimatedSecondsLeft}s left`
                        : `${Math.round(progress.estimatedSecondsLeft / 60)}m left`}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Live progress bar — only while sending */}
            {broadcast.status === "sending" && (
              <div className="mt-3 rounded-full overflow-hidden" style={{ height: 4, background: "rgba(59,130,246,0.15)" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress?.percentComplete ?? Math.round(((broadcast.sent + broadcast.failed) / Math.max(1, broadcast.totalRecipients)) * 100)}%`,
                    background: "linear-gradient(90deg, #3B82F6, #6C63FF)",
                  }}
                />
              </div>
            )}

            {/* Job queue status */}
            {broadcast.status === "sending" && progress?.job && (
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: progress.job.status === "processing" ? "rgba(59,130,246,0.15)" : "rgba(139,149,167,0.12)",
                    color: progress.job.status === "processing" ? "#3B82F6" : "#8B95A7",
                  }}>
                  Worker: {progress.job.status}
                </span>
                <span className="text-[10.5px]" style={{ color: "#8B95A7" }}>
                  Batch size: {progress.job.batchSize} recipients
                </span>
                {progress.job.lastError && (
                  <span className="text-[10.5px]" style={{ color: "#F59E0B" }}>
                    ⚠ {progress.job.lastError}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress ring + main stats */}
        <div
          className="p-6 rounded-2xl mb-6 flex flex-col items-center gap-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="relative flex items-center justify-center">
            <ProgressRing pct={deliveryPct} size={160} stroke={10} />
            <div className="absolute flex flex-col items-center">
              <span className="text-[28px] font-bold tracking-tight" style={{ color: "#F5F7FA" }}>
                {Math.round(deliveryPct * 100)}%
              </span>
              <span className="text-[11px]" style={{ color: "#8B95A7" }}>sent</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            <div className="text-center">
              <p className="text-[11px] font-medium mb-1" style={{ color: "#8B95A7" }}>Total</p>
              <p className="text-[22px] font-bold" style={{ color: "#F5F7FA" }}>{broadcast.totalRecipients.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-medium mb-1" style={{ color: "#10B981" }}>Sent</p>
              <p className="text-[22px] font-bold" style={{ color: "#10B981" }}>{broadcast.sent.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-medium mb-1 flex items-center justify-center gap-1" style={{ color: "#8B95A7" }}>
                Unreachable
                <span title="Recipients outside the 24-hour Messenger window" className="cursor-help">ⓘ</span>
              </p>
              <p className="text-[22px] font-bold" style={{ color: "#8B95A7" }}>{broadcast.ineligibleCount.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-medium mb-1" style={{ color: "#8B95A7" }}>Skipped</p>
              <p className="text-[22px] font-bold" style={{ color: "#8B95A7" }}>{broadcast.skippedCount.toLocaleString()}</p>
            </div>
          </div>

          {broadcast.sent > 0 && (
            <p className="text-[12px]" style={{ color: "#8B95A7" }}>
              Page deliverability rate:{" "}
              <span className="font-semibold" style={{ color: "#F5F7FA" }}>{deliveryRatePct.toFixed(1)}%</span>
            </p>
          )}
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Delivered" value={broadcast.delivered} sub={broadcast.sent > 0 ? `${deliveredPct}% of sent` : undefined} icon={CheckCircle2} color="#6C63FF" />
          <StatCard label="Read / Opened" value={broadcast.read} sub={broadcast.sent > 0 ? `${readPct}% of sent` : undefined} icon={Eye} color="#22D3EE" />
          <StatCard label="Failed" value={otherFailed} sub={otherFailed > 0 ? "Meta API errors" : "None"} icon={XCircle} color="#EF4444" />
          <StatCard label="Credits used" value={broadcast.creditsUsed} icon={Send} color="#F59E0B" />
        </div>

        {/* Meta compliance note for unreachable */}
        {broadcast.ineligibleCount > 0 && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl mb-6"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
          >
            <AlertCircle size={15} style={{ color: "#F59E0B", marginTop: 1, flexShrink: 0 }} />
            <p className="text-[12.5px] leading-relaxed" style={{ color: "#8B95A7" }}>
              <span className="font-semibold" style={{ color: "#F5F7FA" }}>{broadcast.ineligibleCount} recipient{broadcast.ineligibleCount !== 1 ? "s" : ""} were unreachable</span>{" "}
              because they had not sent a message to your Page within the last 24 hours.
              This is a Meta Messenger policy restriction — standard broadcasts can only reach contacts
              who have an active messaging window. Contacts who message you first will become eligible again.
            </p>
          </div>
        )}

        {/* Message content */}
        <div
          className="p-5 rounded-xl mb-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-[13px] font-semibold mb-3" style={{ color: "#F5F7FA" }}>Message Content</h2>
          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "#8B95A7" }}>
            {messageContent}
          </p>
        </div>

        {/* Recipients table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Table header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <h2 className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>
              Recipients
              {broadcast.totalRecipients > 0 && (
                <span className="ml-2 text-[11px] font-normal" style={{ color: "#8B95A7" }}>({broadcast.totalRecipients.toLocaleString()} total)</span>
              )}
            </h2>
            {/* Status filter */}
            <div className="flex items-center gap-1">
              {["all", "sent", "delivered", "read", "failed"].map(s => (
                <button
                  key={s}
                  onClick={() => setRecipientsFilter(s)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg capitalize transition-colors"
                  style={{
                    background: recipientsFilter === s ? "rgba(108,99,255,0.15)" : "transparent",
                    color: recipientsFilter === s ? "#8B85FF" : "#8B95A7",
                    border: recipientsFilter === s ? "1px solid rgba(108,99,255,0.25)" : "1px solid transparent",
                  }}
                >
                  {s === "all" ? `All (${broadcast.totalRecipients})` : `${s} (${(recipientStats[s] ?? 0).toLocaleString()})`}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient rows */}
          {recipients.length === 0 && !recipientsLoading ? (
            <div className="py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>
              No recipients match this filter.
            </div>
          ) : (
            <>
              {recipients.map(r => <RecipientRow key={r.id} r={r} />)}
              {recipientsLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 size={16} className="animate-spin" style={{ color: "#6C63FF" }} />
                </div>
              )}
              {recipientsCursor && !recipientsLoading && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={() => fetchRecipients(recipientsCursor)}
                    className="text-[12.5px] font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color: "#6C63FF", background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.15)" }}
                  >
                    Load more <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
