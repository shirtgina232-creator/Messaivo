"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Send, Loader2, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertCircle, X, RefreshCw, Users, FileText,
  Calendar, MessageSquare, StopCircle, ExternalLink,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

// ── Types ──────────────────────────────────────────────────────────────────────

type BroadcastStatus = "draft" | "scheduled" | "sending" | "completed" | "failed" | "cancelled";

interface BroadcastItem {
  id: string;
  name: string;
  status: BroadcastStatus;
  pageId: string | null;
  templateName: string | null;
  message: string | null;
  scheduledAt: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  totalRecipients?: number;
  sentCount?: number;
  failedCount?: number;
  ineligibleCount?: number;
  skippedCount?: number;
  messagingTag?: string | null;
  _count?: { recipients: number };
}

interface AvailableTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  category: string | null;
  source: "global" | "workspace";
  fields?: Array<{
    key: string; label: string; type: string;
    required: boolean; options?: string[];
  }> | null;
}

interface GroupItem { id: string; name: string; _count?: { members: number } }

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function previewText(b: BroadcastItem, maxLen = 60): string {
  const raw = b.message ?? "";
  const clean = raw.replace(/\{\{(\w+)\}\}/g, (_, k) => k);
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

const STATUS_CFG: Record<BroadcastStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     color: "#8B95A7", bg: "rgba(139,149,167,0.12)", icon: <Clock size={10} /> },
  scheduled: { label: "Scheduled", color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: <Calendar size={10} /> },
  sending:   { label: "Sending",   color: "#8B85FF", bg: "rgba(108,99,255,0.12)",  icon: <Loader2 size={10} className="animate-spin" /> },
  completed: { label: "Delivered", color: "#10B981", bg: "rgba(16,185,129,0.12)",  icon: <CheckCircle2 size={10} /> },
  failed:    { label: "Failed",    color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: <AlertCircle size={10} /> },
  cancelled: { label: "Cancelled", color: "#8B95A7", bg: "rgba(139,149,167,0.12)", icon: <X size={10} /> },
};

// ── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as BroadcastStatus] ?? STATUS_CFG.draft;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Progress Bar ───────────────────────────────────────────────────────────────

function ProgressCell({ b }: { b: BroadcastItem }) {
  const total = b.totalRecipients ?? b._count?.recipients ?? 0;
  const sent = b.sentCount ?? 0;
  if (total === 0) return <span style={{ color: "#8B95A7", fontSize: 12 }}>—</span>;
  const pct = Math.round((sent / total) * 100);
  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold" style={{ color: "#10B981" }}>{sent.toLocaleString()} delivered</span>
        <span className="text-[10px]" style={{ color: "#8B95A7" }}>{pct}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#10B981" }} />
      </div>
    </div>
  );
}

// ── Cancel Confirm Dialog ──────────────────────────────────────────────────────

function CancelConfirmDialog({ broadcast, onConfirm, onDismiss, cancelling }: {
  broadcast: BroadcastItem;
  onConfirm: () => void;
  onDismiss: () => void;
  cancelling: boolean;
}) {
  const delivered = broadcast.sentCount ?? 0;
  const total = broadcast.totalRecipients ?? broadcast._count?.recipients ?? 0;
  const remaining = Math.max(0, total - delivered);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!cancelling ? onDismiss : undefined} />
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0D1520", border: "1px solid rgba(239,68,68,0.25)" }}>
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}>
            <StopCircle size={20} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Cancel Broadcast?</h3>
            <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: "#8B95A7" }}>
              Are you sure you want to cancel <strong style={{ color: "#F5F7FA" }}>&ldquo;{broadcast.name}&rdquo;</strong>?
              Messages that have already been delivered cannot be undone.
            </p>
          </div>
        </div>

        {/* Stats */}
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

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onDismiss} disabled={cancelling}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#F5F7FA" }}>
            Keep Sending
          </button>
          <button onClick={onConfirm} disabled={cancelling}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#EF4444" }}>
            {cancelling
              ? <><Loader2 size={13} className="animate-spin" /> Cancelling…</>
              : <><StopCircle size={13} /> Cancel Broadcast</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Broadcasts Table ───────────────────────────────────────────────────────────

function BroadcastsTable({ broadcasts, pageMap, onRefresh, loading, onCancel, onViewDetails }: {
  broadcasts: BroadcastItem[];
  pageMap: Record<string, string>;
  onRefresh: () => void;
  loading: boolean;
  onCancel: (b: BroadcastItem) => void;
  onViewDetails: (b: BroadcastItem) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filtered = broadcasts.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.message ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search broadcasts…"
            className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          />
        </div>
        <button onClick={onRefresh} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px]"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Header */}
        <div className="grid text-[10.5px] font-semibold uppercase tracking-widest px-4 py-2.5"
          style={{ gridTemplateColumns: "2fr 1fr 120px 140px 70px 80px", background: "rgba(255,255,255,0.025)", color: "#8B95A7", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span>Campaign</span>
          <span>Page</span>
          <span>Status</span>
          <span>Delivered</span>
          <span>Actions</span>
          <span>Created</span>
        </div>

        {loading && broadcasts.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: "#8B95A7" }}>
            <Loader2 size={16} className="animate-spin" /> Loading broadcasts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: "#8B95A7" }}>
            <MessageSquare size={28} style={{ opacity: 0.3 }} />
            <p className="text-[13px]">{search ? "No broadcasts match your search." : "No broadcasts yet. Click + New Broadcast to get started."}</p>
          </div>
        ) : (
          filtered.map((b, i) => {
            const isExpanded = expanded.has(b.id);
            const pageName = b.pageId ? (pageMap[b.pageId] ?? "Unknown Page") : "All Pages";
            return (
              <div key={b.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                {/* Row */}
                <div className="grid items-center px-4 py-3.5 transition-colors hover:bg-white/[0.02]"
                  style={{ gridTemplateColumns: "2fr 1fr 120px 140px 70px 80px" }}>
                  {/* Campaign — clickable to expand */}
                  <button
                    onClick={() => setExpanded(prev => {
                      const next = new Set(prev);
                      next.has(b.id) ? next.delete(b.id) : next.add(b.id);
                      return next;
                    })}
                    className="flex items-center gap-2 min-w-0 text-left">
                    {isExpanded ? <ChevronDown size={12} style={{ color: "#8B95A7" }} /> : <ChevronRight size={12} style={{ color: "#8B95A7" }} />}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>{b.name}</p>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: "#8B95A7" }}>{previewText(b)}</p>
                    </div>
                  </button>
                  {/* Page */}
                  <div className="text-[12px] truncate pr-2" style={{ color: "#C4CDD8" }}>{pageName}</div>
                  {/* Status */}
                  <div><StatusBadge status={b.status} /></div>
                  {/* Delivered */}
                  <ProgressCell b={b} />
                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewDetails(b)}
                      title="View details"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/5"
                      style={{ color: "#8B85FF", border: "1px solid rgba(139,133,255,0.25)" }}>
                      <ExternalLink size={11} /> Details
                    </button>
                    {b.status === "sending" && (
                      <button
                        onClick={() => onCancel(b)}
                        title="Cancel broadcast"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:bg-red-500/10"
                        style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                        <StopCircle size={11} /> Cancel
                      </button>
                    )}
                  </div>
                  {/* Created */}
                  <div className="text-[11px]" style={{ color: "#8B95A7" }}>{timeAgo(b.createdAt)}</div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-4 text-[12px]"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
                    <div className="flex flex-col gap-2">
                      <Row label="Template" value={b.templateName ?? "Custom Message"} />
                      <Row label="Recipients" value={(b.totalRecipients ?? b._count?.recipients ?? 0).toLocaleString()} />
                      <Row label="Sent" value={(b.sentCount ?? 0).toLocaleString()} />
                      <Row label="Failed" value={(b.failedCount ?? 0).toLocaleString()} />
                      <Row label="Skipped" value={((b.ineligibleCount ?? 0) + (b.skippedCount ?? 0)).toLocaleString()} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Row label="Created" value={fmtDate(b.createdAt)} />
                      <Row label="Scheduled" value={fmtDate(b.scheduledAt)} />
                      <Row label="Started" value={fmtDate(b.startedAt ?? null)} />
                      <Row label="Completed" value={fmtDate(b.completedAt ?? null)} />
                      {b.messagingTag && <Row label="Tag" value={b.messagingTag} />}
                    </div>
                    {/* Message preview */}
                    {b.message && (
                      <div className="col-span-2 rounded-lg p-3"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>Message</p>
                        <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "#C4CDD8" }}>{b.message}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "#8B95A7", minWidth: 80 }}>{label}</span>
      <span style={{ color: "#C4CDD8" }}>{value}</span>
    </div>
  );
}

// ── New Broadcast Slide Panel ──────────────────────────────────────────────────

function NewBroadcastPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { pages } = useWorkspace();

  // Form state
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const [broadcastName, setBroadcastName] = useState("");
  const [recipientMode, setRecipientMode] = useState<"all" | "groups">("all");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Message
  const [messageMode, setMessageMode] = useState<"template" | "custom">("template");
  const [templates, setTemplates] = useState<AvailableTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<AvailableTemplate | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Schedule
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [schedDate, setSchedDate] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Recipient count estimate
  const [recipientEst, setRecipientEst] = useState<number | null>(null);

  // Load templates
  useEffect(() => {
    setTemplatesLoading(true);
    const q = new URLSearchParams();
    if (templateSearch) q.set("search", templateSearch);
    fetch(`/api/broadcast-templates?${q}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { templates?: AvailableTemplate[] } | null) => { if (d?.templates) setTemplates(d.templates); })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, [templateSearch]);

  // Load groups
  useEffect(() => {
    if (recipientMode !== "groups") return;
    setGroupsLoading(true);
    fetch("/api/groups")
      .then(r => r.ok ? r.json() : null)
      .then((d: { groups?: GroupItem[] } | null) => { if (d?.groups) setGroups(d.groups); })
      .catch(() => {})
      .finally(() => setGroupsLoading(false));
  }, [recipientMode]);

  // Reset field values when template changes
  useEffect(() => {
    if (!selectedTemplate) { setFieldValues({}); return; }
    const init: Record<string, string> = {};
    const CONTACT_VARS = new Set(["first_name", "last_name", "name", "page_name"]);
    for (const f of (selectedTemplate.fields ?? [])) {
      if (!CONTACT_VARS.has(f.key)) init[f.key] = "";
    }
    setFieldValues(init);
  }, [selectedTemplate?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Estimate recipients for display
  useEffect(() => {
    if (!pageId) { setRecipientEst(null); return; }
    fetch(`/api/broadcasts/eligibility-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: { total?: number } | null) => setRecipientEst(d?.total ?? null))
      .catch(() => {});
  }, [pageId]);

  const CONTACT_VARS = new Set(["first_name", "last_name", "name", "page_name"]);
  const customFields = selectedTemplate?.fields?.filter(f => !CONTACT_VARS.has(f.key)) ?? [];
  const unfilledRequired = customFields.filter(f => f.required && !(fieldValues[f.key] ?? "").trim());

  const canSend = !!pageId && !!broadcastName.trim() &&
    (messageMode === "custom" ? !!customMessage.trim() : (!!selectedTemplate && unfilledRequired.length === 0)) &&
    (scheduleMode === "now" || (scheduleMode === "later" && !!schedDate)) &&
    (recipientMode === "all" || selectedGroups.size > 0);

  const handleSend = useCallback(async (mode: "send" | "draft") => {
    if (!pageId) return;
    setSubmitting(true); setError("");
    try {
      const body: Record<string, unknown> = {
        name: broadcastName.trim(),
        pageId,
        fieldValues,
      };

      if (messageMode === "template" && selectedTemplate) {
        if (selectedTemplate.source === "global") body.templateId = selectedTemplate.id;
        else body.messageTemplateId = selectedTemplate.id;
      } else {
        body.message = customMessage.trim();
      }

      if (recipientMode === "all") {
        body.allPageContacts = true;
      } else {
        // groups → will be resolved by eligibility check on send; pass group ids
        // For now send all groups as contacts via a groups resolution
        body.groupIds = [...selectedGroups];
        body.allPageContacts = false;
      }

      if (mode === "send" && scheduleMode === "later" && schedDate) {
        body.scheduledAt = new Date(schedDate).toISOString();
      }

      const res = await fetch("/api/broadcasts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to create broadcast."); return;
      }
      const { broadcast } = await res.json() as { broadcast: { id: string } };

      if (mode === "draft") { onCreated(); onClose(); return; }
      if (scheduleMode === "later") { onCreated(); onClose(); return; }

      // Send now
      const sendRes = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: "POST" });
      if (!sendRes.ok) {
        const d = await sendRes.json() as { error?: string };
        setError(d.error ?? "Broadcast saved but send failed."); onCreated(); return;
      }
      onCreated(); onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }, [pageId, broadcastName, fieldValues, messageMode, selectedTemplate, customMessage, recipientMode, selectedGroups, scheduleMode, schedDate, onCreated, onClose]);

  const filteredTemplates = templates.filter(t =>
    !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />

      {/* Panel */}
      <div className="w-full max-w-xl flex flex-col overflow-hidden shadow-2xl"
        style={{ background: "#080F18", borderLeft: "1px solid rgba(255,255,255,0.09)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>New Broadcast</h2>
            <p className="text-[12px] mt-0.5" style={{ color: "#8B95A7" }}>Send a message to your page subscribers</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "#8B95A7" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Broadcast name */}
          <FormSection label="Broadcast Name">
            <input value={broadcastName} onChange={e => setBroadcastName(e.target.value)}
              placeholder="e.g. September Promotion"
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} />
            <p className="text-[11px] mt-1" style={{ color: "#8B95A7" }}>Internal name — not visible to recipients.</p>
          </FormSection>

          {/* Select Page */}
          <FormSection label="Select Page">
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {pages.map(p => (
                <button key={p.id} onClick={() => setPageId(p.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors text-[13px]"
                  style={{
                    background: pageId === p.id ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${pageId === p.id ? "rgba(108,99,255,0.4)" : "rgba(255,255,255,0.07)"}`,
                    color: pageId === p.id ? "#F5F7FA" : "#C4CDD8",
                  }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: p.color ?? "#6C63FF" }}>
                    {p.avatar ?? p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="truncate font-medium">{p.name}</span>
                </button>
              ))}
            </div>
            {recipientEst !== null && (
              <p className="text-[11.5px] mt-1.5 flex items-center gap-1" style={{ color: "#8B95A7" }}>
                <Users size={11} /> {recipientEst.toLocaleString()} contacts reachable now
              </p>
            )}
          </FormSection>

          {/* Recipients */}
          <FormSection label="Send To">
            <div className="flex gap-2">
              {([["all", "All Subscribers"], ["groups", "Specific Groups"]] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setRecipientMode(mode)}
                  className="flex-1 py-2 rounded-lg text-[12.5px] font-medium transition-colors"
                  style={{
                    background: recipientMode === mode ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${recipientMode === mode ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                    color: recipientMode === mode ? "#F5F7FA" : "#8B95A7",
                  }}>
                  {label}
                </button>
              ))}
            </div>
            {recipientMode === "groups" && (
              <div className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                {groupsLoading ? (
                  <div className="flex items-center gap-2 p-3 text-[12px]" style={{ color: "#8B95A7" }}>
                    <Loader2 size={12} className="animate-spin" /> Loading groups…
                  </div>
                ) : groups.length === 0 ? (
                  <p className="p-3 text-[12px]" style={{ color: "#8B95A7" }}>No groups found. Create groups first.</p>
                ) : (
                  groups.map((g, i) => (
                    <button key={g.id} onClick={() => setSelectedGroups(prev => {
                      const next = new Set(prev);
                      next.has(g.id) ? next.delete(g.id) : next.add(g.id);
                      return next;
                    })}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
                      style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <span className="text-[12.5px]" style={{ color: "#C4CDD8" }}>{g.name}</span>
                      <div className="flex items-center gap-2">
                        {g._count && <span className="text-[11px]" style={{ color: "#8B95A7" }}>{g._count.members.toLocaleString()}</span>}
                        <div className="w-4 h-4 rounded flex items-center justify-center"
                          style={{ background: selectedGroups.has(g.id) ? "#6C63FF" : "rgba(255,255,255,0.07)", border: `1px solid ${selectedGroups.has(g.id) ? "#6C63FF" : "rgba(255,255,255,0.15)"}` }}>
                          {selectedGroups.has(g.id) && <CheckCircle2 size={10} style={{ color: "#fff" }} />}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </FormSection>

          {/* Message */}
          <FormSection label="Message">
            <div className="flex gap-2 mb-3">
              {([["template", "Use Template", <FileText key="t" size={12} />], ["custom", "Write Message", <MessageSquare key="m" size={12} />]] as const).map(([mode, label, icon]) => (
                <button key={mode} onClick={() => setMessageMode(mode)}
                  className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-[12.5px] font-medium"
                  style={{
                    background: messageMode === mode ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${messageMode === mode ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                    color: messageMode === mode ? "#F5F7FA" : "#8B95A7",
                  }}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {messageMode === "template" ? (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
                  <input value={templateSearch} onChange={e => setTemplateSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#F5F7FA" }} />
                </div>
                <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                  {templatesLoading ? (
                    <div className="flex items-center gap-2 py-4 justify-center text-[12px]" style={{ color: "#8B95A7" }}>
                      <Loader2 size={12} className="animate-spin" /> Loading templates…
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <p className="py-4 text-center text-[12px]" style={{ color: "#8B95A7" }}>No approved templates available.</p>
                  ) : (
                    filteredTemplates.map(t => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t)}
                        className="flex flex-col gap-0.5 text-left px-3 py-2.5 rounded-lg transition-colors"
                        style={{
                          background: selectedTemplate?.id === t.id ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${selectedTemplate?.id === t.id ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.06)"}`,
                        }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-medium" style={{ color: "#F5F7FA" }}>{t.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: t.source === "global" ? "rgba(16,185,129,0.12)" : "rgba(108,99,255,0.12)", color: t.source === "global" ? "#10B981" : "#8B85FF" }}>
                            {t.source === "global" ? "Platform" : "Custom"}
                          </span>
                        </div>
                        {t.description && <span className="text-[11px]" style={{ color: "#8B95A7" }}>{t.description}</span>}
                      </button>
                    ))
                  )}
                </div>

                {/* Variable fields for selected template */}
                {selectedTemplate && customFields.length > 0 && (
                  <div className="mt-2 flex flex-col gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Fill in template variables</p>
                    {customFields.map(f => (
                      <div key={f.key}>
                        <label className="text-[11.5px] font-medium block mb-1" style={{ color: "#C4CDD8" }}>
                          {f.label}{f.required && <span style={{ color: "#EF4444" }}> *</span>}
                        </label>
                        {f.type === "DROPDOWN" && f.options?.length ? (
                          <select value={fieldValues[f.key] ?? ""} onChange={e => setFieldValues(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}>
                            <option value="">Select…</option>
                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : f.type === "TEXTAREA" ? (
                          <textarea rows={3} value={fieldValues[f.key] ?? ""} onChange={e => setFieldValues(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} />
                        ) : (
                          <input type={f.type === "DATE" ? "date" : f.type === "URL" ? "url" : "text"}
                            value={fieldValues[f.key] ?? ""} onChange={e => setFieldValues(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                rows={5} placeholder="Type your message here…"
                className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} />
            )}
          </FormSection>

          {/* Schedule */}
          <FormSection label="Schedule (Optional)">
            <div className="flex gap-2 mb-2">
              {([["now", "Send Now"], ["later", "Schedule"]] as const).map(([m, l]) => (
                <button key={m} onClick={() => setScheduleMode(m)}
                  className="flex-1 py-2 rounded-lg text-[12.5px] font-medium"
                  style={{
                    background: scheduleMode === m ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${scheduleMode === m ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                    color: scheduleMode === m ? "#F5F7FA" : "#8B95A7",
                  }}>
                  {l}
                </button>
              ))}
            </div>
            {scheduleMode === "later" && (
              <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-[12.5px] outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} />
            )}
          </FormSection>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-[12px]"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={() => handleSend("draft")} disabled={submitting || !broadcastName.trim()}
            className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: !broadcastName.trim() ? "#8B95A7" : "#F5F7FA",
              opacity: !broadcastName.trim() ? 0.5 : 1,
            }}>
            Save Draft
          </button>
          <button onClick={() => handleSend("send")} disabled={submitting || !canSend}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: "#6C63FF", opacity: (submitting || !canSend) ? 0.5 : 1 }}>
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> {scheduleMode === "later" ? "Scheduling…" : "Sending…"}</>
              : <><Send size={14} /> {scheduleMode === "later" ? "Schedule Broadcast" : "Send Now"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8B95A7" }}>{label}</label>
      {children}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BroadcastsPage() {
  const { pages } = useWorkspace();
  const router = useRouter();

  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageMap, setPageMap] = useState<Record<string, string>>({});
  const [showNew, setShowNew] = useState(false);

  // Cancel flow
  const [cancelTarget, setCancelTarget] = useState<BroadcastItem | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Build pageId → name map from workspace pages
  useEffect(() => {
    const m: Record<string, string> = {};
    for (const p of pages) m[p.id] = p.name;
    setPageMap(m);
  }, [pages]);

  const fetchBroadcasts = useCallback(() => {
    setLoading(true);
    fetch("/api/broadcasts?limit=100")
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcasts?: BroadcastItem[] } | null) => {
        if (d?.broadcasts) setBroadcasts(d.broadcasts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  // Auto-refresh while any broadcast is in "sending" state
  const hasInFlight = broadcasts.some(b => b.status === "sending");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (hasInFlight) {
      pollRef.current = setInterval(fetchBroadcasts, 8000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [hasInFlight, fetchBroadcasts]);

  const handleCancelConfirm = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelling(true); setCancelError("");
    try {
      const res = await fetch(`/api/broadcasts/${cancelTarget.id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setCancelError(d.error ?? "Failed to cancel broadcast.");
        return;
      }
      setCancelTarget(null);
      fetchBroadcasts();
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }, [cancelTarget, fetchBroadcasts]);

  const sent    = broadcasts.filter(b => b.status === "completed").length;
  const sending = broadcasts.filter(b => b.status === "sending").length;
  const drafted = broadcasts.filter(b => b.status === "draft").length;
  const totalDelivered = broadcasts.reduce((s, b) => s + (b.sentCount ?? 0), 0);

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: "#080F18", color: "#F5F7FA" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: "#F5F7FA" }}>Broadcasts</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#8B95A7" }}>Manage and monitor your message campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          {sending > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full font-medium"
              style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.25)" }}>
              <Loader2 size={11} className="animate-spin" /> {sending} sending
            </span>
          )}
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: "#6C63FF" }}>
            <Plus size={15} /> New Broadcast
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Broadcasts", value: broadcasts.length.toLocaleString(), color: "#F5F7FA" },
          { label: "Completed", value: sent.toLocaleString(), color: "#10B981" },
          { label: "Messages Delivered", value: totalDelivered.toLocaleString(), color: "#8B85FF" },
          { label: "Drafts", value: drafted.toLocaleString(), color: "#F59E0B" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>{s.label}</p>
            <p className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <BroadcastsTable
        broadcasts={broadcasts}
        pageMap={pageMap}
        onRefresh={fetchBroadcasts}
        loading={loading}
        onCancel={b => { setCancelTarget(b); setCancelError(""); }}
        onViewDetails={b => router.push(`/app/broadcasts/${b.id}`)}
      />

      {/* New Broadcast Slide Panel */}
      {showNew && (
        <NewBroadcastPanel
          onClose={() => setShowNew(false)}
          onCreated={() => { fetchBroadcasts(); setShowNew(false); }}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelTarget && (
        <CancelConfirmDialog
          broadcast={cancelTarget}
          onConfirm={handleCancelConfirm}
          onDismiss={() => { setCancelTarget(null); setCancelError(""); }}
          cancelling={cancelling}
        />
      )}

      {/* Cancel error toast */}
      {cancelError && !cancelTarget && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-[13px]"
          style={{ background: "#1A0A0A", border: "1px solid rgba(239,68,68,0.4)", color: "#EF4444" }}>
          <AlertCircle size={14} /> {cancelError}
          <button onClick={() => setCancelError("")} className="ml-2"><X size={13} /></button>
        </div>
      )}
    </div>
  );
}
