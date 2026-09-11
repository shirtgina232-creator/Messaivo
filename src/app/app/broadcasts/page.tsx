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

// Contact variables auto-resolved per recipient at send time
const CONTACT_VARS_SET = new Set(["first_name", "last_name", "name", "page_name"]);
const CONTACT_SAMPLE: Record<string, string> = {
  first_name: "John", last_name: "Doe", name: "John Doe", page_name: "Your Page",
};
const RECIPIENT_VAR_OPTIONS = [
  { label: "First Name",  value: "{{first_name}}" },
  { label: "Last Name",   value: "{{last_name}}" },
  { label: "Full Name",   value: "{{name}}" },
] as const;

// Extract unique non-contact variable keys from template content (e.g. "1", "2", "3")
function extractCustomVars(content: string): string[] {
  const seen = new Set<string>();
  for (const [, k] of content.matchAll(/\{\{(\w+)\}\}/g)) {
    if (!CONTACT_VARS_SET.has(k)) seen.add(k);
  }
  return [...seen];
}

// Two-pass preview: custom vars first (may expand to contact vars), then contact vars
function renderTwoPassPreview(content: string, fieldValues: Record<string, string>, pageName: string): string {
  const contactSamples = { ...CONTACT_SAMPLE, page_name: pageName };
  // Pass 1: replace positional/custom vars with their field values
  const pass1 = content.replace(/\{\{(\w+)\}\}/g, (match, k) =>
    k in fieldValues ? fieldValues[k] : match
  );
  // Pass 2: replace any contact vars (including those just injected by pass1)
  return pass1.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    k in contactSamples ? (contactSamples as Record<string, string>)[k] : `{{${k}}}`
  );
}

function NewBroadcastPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { pages } = useWorkspace();

  // ── Basic info ─────────────────────────────────────────────────────────────
  const [broadcastName, setBroadcastName] = useState("");
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");

  // ── Audience ───────────────────────────────────────────────────────────────
  const [recipientMode, setRecipientMode] = useState<"all" | "groups">("all");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [groupsLoading, setGroupsLoading] = useState(false);

  // ── Reachable count ────────────────────────────────────────────────────────
  const [reachable, setReachable] = useState<{
    total: number; eligible: number;
    windowOpen: number; windowClosed: number; neverMessaged: number; unsubscribed: number;
  } | null>(null);
  const [reachableLoading, setReachableLoading] = useState(false);

  // ── Message ────────────────────────────────────────────────────────────────
  const [messageMode, setMessageMode] = useState<"template" | "custom">("template");
  const [templates, setTemplates] = useState<AvailableTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<AvailableTemplate | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  // fieldValues: maps variable key (e.g. "1","2") → user-entered value (may contain {{first_name}})
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  // Which field's recipient-var dropdown is open
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Custom message (write-message mode)
  const [customMessage, setCustomMessage] = useState("");

  // ── Schedule ───────────────────────────────────────────────────────────────
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [schedDate, setSchedDate] = useState("");

  // ── Submit ─────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Load templates ─────────────────────────────────────────────────────────
  useEffect(() => {
    setTemplatesLoading(true);
    fetch(`/api/broadcast-templates?${templateSearch ? `search=${encodeURIComponent(templateSearch)}` : ""}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { templates?: AvailableTemplate[] } | null) => { if (d?.templates) setTemplates(d.templates); })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, [templateSearch]);

  // ── Load groups ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (recipientMode !== "groups") return;
    setGroupsLoading(true);
    fetch("/api/groups")
      .then(r => r.ok ? r.json() : null)
      .then((d: { groups?: GroupItem[] } | null) => { if (d?.groups) setGroups(d.groups); })
      .catch(() => {})
      .finally(() => setGroupsLoading(false));
  }, [recipientMode]);

  // ── Init field values when template changes ────────────────────────────────
  useEffect(() => {
    if (!selectedTemplate) { setFieldValues({}); return; }
    const vars = extractCustomVars(selectedTemplate.content);
    setFieldValues(prev => {
      const next: Record<string, string> = {};
      for (const v of vars) next[v] = prev[v] ?? "";
      return next;
    });
  }, [selectedTemplate?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear when switching to custom ────────────────────────────────────────
  useEffect(() => {
    if (messageMode === "custom") { setSelectedTemplate(null); setFieldValues({}); }
  }, [messageMode]);

  // ── Live reachable count ───────────────────────────────────────────────────
  const reachableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!pageId) { setReachable(null); return; }
    if (reachableTimerRef.current) clearTimeout(reachableTimerRef.current);
    reachableTimerRef.current = setTimeout(async () => {
      setReachableLoading(true);
      try {
        const body: Record<string, unknown> = { pageId };
        if (recipientMode === "groups" && selectedGroups.size > 0) body.groupIds = [...selectedGroups];
        const res = await fetch("/api/broadcasts/eligibility-check", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (res.ok) {
          const d = await res.json() as {
            total: number; windowOpen: number; windowClosed: number;
            neverMessaged: number; unsubscribed: number;
          };
          setReachable({
            total: d.total, eligible: d.windowOpen,
            windowOpen: d.windowOpen, windowClosed: d.windowClosed,
            neverMessaged: d.neverMessaged, unsubscribed: d.unsubscribed,
          });
        }
      } catch { /* ignore */ }
      finally { setReachableLoading(false); }
    }, 400);
    return () => { if (reachableTimerRef.current) clearTimeout(reachableTimerRef.current); };
  }, [pageId, recipientMode, selectedGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPage = pages.find(p => p.id === pageId);
  const filteredTemplates = templates.filter(t =>
    !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // Derive variables and preview
  const customVars = selectedTemplate ? extractCustomVars(selectedTemplate.content) : [];
  const hasContactVars = selectedTemplate
    ? [...selectedTemplate.content.matchAll(/\{\{(\w+)\}\}/g)].some(([, k]) => CONTACT_VARS_SET.has(k))
    : false;

  const previewContent = messageMode === "template" && selectedTemplate
    ? renderTwoPassPreview(selectedTemplate.content, fieldValues, selectedPage?.name ?? "Your Page")
    : messageMode === "custom" && customMessage
    ? renderTwoPassPreview(customMessage, {}, selectedPage?.name ?? "Your Page")
    : "";

  const allRequiredFilled = customVars.every(v => (fieldValues[v] ?? "").trim() !== "");

  const canSend = !!pageId && !!broadcastName.trim() &&
    (messageMode === "template"
      ? !!selectedTemplate && allRequiredFilled
      : !!customMessage.trim()) &&
    (scheduleMode === "now" || !!schedDate) &&
    (recipientMode === "all" || selectedGroups.size > 0);

  const handleSend = useCallback(async (mode: "send" | "draft") => {
    if (!pageId) return;
    setSubmitting(true); setError("");
    try {
      const body: Record<string, unknown> = { name: broadcastName.trim(), pageId };

      if (messageMode === "template" && selectedTemplate) {
        if (selectedTemplate.source === "global") {
          body.templateId = selectedTemplate.id;
          body.fieldValues = fieldValues;
        } else {
          // User template — pass id + field values; worker resolves per-recipient
          body.messageTemplateId = selectedTemplate.id;
          body.fieldValues = fieldValues;
        }
      } else {
        body.message = customMessage.trim();
      }

      if (recipientMode === "all") body.allPageContacts = true;
      else body.groupIds = [...selectedGroups];

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

      const sendRes = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: "POST" });
      if (!sendRes.ok) {
        const d = await sendRes.json() as { error?: string };
        setError(d.error ?? "Broadcast saved but send failed."); onCreated(); return;
      }
      onCreated(); onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }, [pageId, broadcastName, messageMode, selectedTemplate, fieldValues, customMessage, recipientMode, selectedGroups, scheduleMode, schedDate, onCreated, onClose]);

  const FIELD_STYLE = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />

      <div className="w-full max-w-xl flex flex-col overflow-hidden shadow-2xl"
        style={{ background: "#080F18", borderLeft: "1px solid rgba(255,255,255,0.09)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>Bulk Message</h2>
            <p className="text-[12px] mt-0.5" style={{ color: "#8B95A7" }}>Send a bulk message to your selected page audience.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "#8B95A7" }}><X size={16} /></button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* ① Name */}
          <FormSection label="Broadcast Name">
            <input value={broadcastName} onChange={e => setBroadcastName(e.target.value)}
              placeholder="e.g. September Notification"
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={FIELD_STYLE} />
            <p className="text-[11px] mt-1" style={{ color: "#8B95A7" }}>Internal name — not visible to recipients.</p>
          </FormSection>

          {/* ② Page + subscriber count */}
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
                    style={{ background: (p as { color?: string }).color ?? "#6C63FF", color: "#fff" }}>
                    {(p as { avatar?: string }).avatar ?? p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="truncate font-medium">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-2">
              {reachableLoading
                ? <span className="flex items-center gap-1 text-[11.5px]" style={{ color: "#8B95A7" }}><Loader2 size={10} className="animate-spin" /> Counting audience…</span>
                : reachable !== null
                ? <div className="flex flex-col gap-1.5">
                    {/* Summary row */}
                    <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "#8B95A7" }}>
                      <Users size={11} />
                      <strong style={{ color: "#F5F7FA" }}>{reachable.total.toLocaleString()}</strong> total contacts
                    </div>
                    {/* Breakdown grid */}
                    <div className="grid grid-cols-2 gap-1.5 rounded-lg p-2.5"
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#10B981" }} />
                        <span className="text-[11px]" style={{ color: "#8B95A7" }}>
                          <strong style={{ color: "#10B981" }}>{reachable.windowOpen.toLocaleString()}</strong> reachable <span style={{ opacity: 0.6 }}>(24h window open)</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#F59E0B" }} />
                        <span className="text-[11px]" style={{ color: "#8B95A7" }}>
                          <strong style={{ color: "#F59E0B" }}>{reachable.windowClosed.toLocaleString()}</strong> window closed <span style={{ opacity: 0.6 }}>(messaged &gt;24h ago)</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#8B95A7" }} />
                        <span className="text-[11px]" style={{ color: "#8B95A7" }}>
                          <strong style={{ color: "#C4CDD8" }}>{reachable.neverMessaged.toLocaleString()}</strong> never messaged <span style={{ opacity: 0.6 }}>(no inbound record)</span>
                        </span>
                      </div>
                      {reachable.unsubscribed > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#EF4444" }} />
                          <span className="text-[11px]" style={{ color: "#8B95A7" }}>
                            <strong style={{ color: "#EF4444" }}>{reachable.unsubscribed.toLocaleString()}</strong> unsubscribed
                          </span>
                        </div>
                      )}
                    </div>
                    {reachable.windowOpen === 0 && (
                      <p className="text-[11px] leading-relaxed" style={{ color: "#F59E0B" }}>
                        ⚠ No contacts have messaged this page in the last 24 hours — the Meta 24-hour window is closed for all subscribers.
                      </p>
                    )}
                  </div>
                : null}
            </div>
          </FormSection>

          {/* ③ Audience */}
          <FormSection label="Send To">
            <div className="flex gap-2">
              {([["all", "All Subscribers"], ["groups", "Specific Groups"]] as const).map(([m, lbl]) => (
                <button key={m} onClick={() => { setRecipientMode(m); setSelectedGroups(new Set()); }}
                  className="flex-1 py-2 rounded-lg text-[12.5px] font-medium"
                  style={{
                    background: recipientMode === m ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${recipientMode === m ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                    color: recipientMode === m ? "#F5F7FA" : "#8B95A7",
                  }}>{lbl}</button>
              ))}
            </div>
            {recipientMode === "groups" && (
              <div className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                {groupsLoading
                  ? <div className="flex items-center gap-2 p-3 text-[12px]" style={{ color: "#8B95A7" }}><Loader2 size={12} className="animate-spin" /> Loading groups…</div>
                  : groups.length === 0
                  ? <p className="p-3 text-[12px]" style={{ color: "#8B95A7" }}>No groups found.</p>
                  : groups.map((g, i) => (
                    <button key={g.id}
                      onClick={() => setSelectedGroups(prev => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; })}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.02]"
                      style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <span className="text-[12.5px]" style={{ color: "#C4CDD8" }}>{g.name}</span>
                      <div className="flex items-center gap-2">
                        {g._count && <span className="text-[11px]" style={{ color: "#8B95A7" }}>{g._count.members.toLocaleString()} members</span>}
                        <div className="w-4 h-4 rounded flex items-center justify-center"
                          style={{ background: selectedGroups.has(g.id) ? "#6C63FF" : "rgba(255,255,255,0.07)", border: `1px solid ${selectedGroups.has(g.id) ? "#6C63FF" : "rgba(255,255,255,0.15)"}` }}>
                          {selectedGroups.has(g.id) && <CheckCircle2 size={10} style={{ color: "#fff" }} />}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </FormSection>

          {/* ④ Message */}
          <FormSection label="Message">
            {/* Mode tabs */}
            <div className="flex gap-2 mb-3">
              {([["template", "Use Template", <FileText key="t" size={12} />], ["custom", "Write Message", <MessageSquare key="m" size={12} />]] as const).map(([m, lbl, icon]) => (
                <button key={m} onClick={() => setMessageMode(m as "template" | "custom")}
                  className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-[12.5px] font-medium"
                  style={{
                    background: messageMode === m ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${messageMode === m ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                    color: messageMode === m ? "#F5F7FA" : "#8B95A7",
                  }}>
                  {icon} {lbl}
                </button>
              ))}
            </div>

            {messageMode === "template" ? (
              <div className="flex flex-col gap-4">
                {/* Template picker */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
                    <input value={templateSearch} onChange={e => setTemplateSearch(e.target.value)}
                      placeholder="Search templates…" className="w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none" style={FIELD_STYLE} />
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {templatesLoading
                      ? <div className="flex items-center gap-2 py-3 justify-center text-[12px]" style={{ color: "#8B95A7" }}><Loader2 size={12} className="animate-spin" /> Loading templates…</div>
                      : filteredTemplates.length === 0
                      ? <p className="py-3 text-center text-[12px]" style={{ color: "#8B95A7" }}>No approved templates available.</p>
                      : filteredTemplates.map(t => (
                        <button key={t.id} onClick={() => setSelectedTemplate(prev => prev?.id === t.id ? null : t)}
                          className="flex flex-col gap-0.5 text-left px-3 py-2.5 rounded-lg"
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
                            {selectedTemplate?.id === t.id && <CheckCircle2 size={11} className="ml-auto" style={{ color: "#6C63FF" }} />}
                          </div>
                          {t.description && <span className="text-[11px]" style={{ color: "#8B95A7" }}>{t.description}</span>}
                          {/* Show variable placeholders as chips */}
                          {extractCustomVars(t.content).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {extractCustomVars(t.content).slice(0, 4).map(v => (
                                <span key={v} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded"
                                  style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>{`{{${v}}}`}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Variable fields — shown when template selected */}
                {selectedTemplate && (
                  <div className="flex flex-col gap-1 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
                        {selectedTemplate.name} — Variable Values
                      </p>
                      <button onClick={() => setSelectedTemplate(null)} className="text-[10.5px] flex items-center gap-1" style={{ color: "#8B95A7" }}>
                        <X size={10} /> Clear
                      </button>
                    </div>

                    {/* Contact vars notice */}
                    {hasContactVars && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg mb-2 text-[11.5px]"
                        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#10B981" }}>
                        <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
                        <span>Contact variables like <code className="font-mono">{"{{first_name}}"}</code> are auto-filled per recipient — no input needed.</span>
                      </div>
                    )}

                    {/* One input per positional variable */}
                    {customVars.length === 0 ? (
                      <p className="text-[12px] py-2 text-center" style={{ color: "#8B95A7" }}>No variable fields — this template has fixed text.</p>
                    ) : (
                      customVars.map(varKey => (
                        <div key={varKey} className="mb-3">
                          <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#C4CDD8" }}>
                            Value for <code className="font-mono text-[11px] px-1 py-0.5 rounded"
                              style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF" }}>{`{{${varKey}}}`}</code>
                            <span style={{ color: "#EF4444" }}> *</span>
                          </label>
                          {/* Input + recipient var dropdown */}
                          <div className="relative">
                            <input
                              value={fieldValues[varKey] ?? ""}
                              onChange={e => setFieldValues(p => ({ ...p, [varKey]: e.target.value }))}
                              placeholder={`Value for variable ${varKey}`}
                              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                              style={FIELD_STYLE}
                              onClick={() => setOpenDropdown(null)}
                            />
                          </div>
                          {/* Insert recipient name row */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdown(prev => prev === varKey ? null : varKey)}
                                className="flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded"
                                style={{ background: "rgba(108,99,255,0.08)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.2)" }}>
                                <Users size={10} /> Insert Recipient Name <ChevronDown size={9} />
                              </button>
                              {openDropdown === varKey && (
                                <div className="absolute left-0 top-full mt-1 z-20 rounded-lg overflow-hidden shadow-xl"
                                  style={{ background: "#0D1520", border: "1px solid rgba(255,255,255,0.1)", minWidth: 160 }}>
                                  {RECIPIENT_VAR_OPTIONS.map(opt => (
                                    <button key={opt.value}
                                      onClick={() => { setFieldValues(p => ({ ...p, [varKey]: opt.value })); setOpenDropdown(null); }}
                                      className="w-full text-left px-3 py-2 text-[12px] hover:bg-white/[0.04] flex items-center justify-between gap-4"
                                      style={{ color: "#F5F7FA" }}>
                                      <span>{opt.label}</span>
                                      <code className="text-[10.5px] font-mono" style={{ color: "#8B85FF" }}>{opt.value}</code>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-[11px]" style={{ color: "rgba(139,149,167,0.55)" }}>
                              Use <code className="font-mono">{"{{first_name}}"}</code>, <code className="font-mono">{"{{last_name}}"}</code>, <code className="font-mono">{"{{name}}"}</code>
                            </span>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Live preview */}
                    <div className="mt-1 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="px-3 py-2 flex items-center gap-1.5"
                        style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <MessageSquare size={11} style={{ color: "#8B95A7" }} />
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Preview</span>
                        <span className="ml-auto text-[10px]" style={{ color: "rgba(139,149,167,0.5)" }}>Sample: John Doe</span>
                      </div>
                      <div className="px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "#C4CDD8", fontFamily: "inherit" }}>
                        {previewContent || <span style={{ color: "#8B95A7", fontStyle: "italic" }}>Fill in variable values to see preview…</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Custom message mode */
              <div className="flex flex-col gap-3">
                <textarea
                  value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                  rows={5} placeholder="Type your message here…"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none resize-y leading-relaxed"
                  style={{ ...FIELD_STYLE, minHeight: 100 }} />
                {customMessage && (
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="px-3 py-2 flex items-center gap-1.5"
                      style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <MessageSquare size={11} style={{ color: "#8B95A7" }} />
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Preview</span>
                    </div>
                    <div className="px-4 py-3 flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ background: (selectedPage as { color?: string } | undefined)?.color ?? "#6C63FF", color: "#fff" }}>
                        {selectedPage?.name.slice(0, 1).toUpperCase() ?? "P"}
                      </div>
                      <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-[13px] leading-relaxed whitespace-pre-wrap"
                        style={{ background: "rgba(255,255,255,0.07)", color: "#F5F7FA" }}>
                        {previewContent}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* ⑤ Schedule */}
          <FormSection label="Schedule (Optional)">
            <div className="flex gap-2 mb-2">
              {([["now", "Send Now"], ["later", "Schedule"]] as const).map(([m, l]) => (
                <button key={m} onClick={() => setScheduleMode(m)}
                  className="flex-1 py-2 rounded-lg text-[12.5px] font-medium"
                  style={{
                    background: scheduleMode === m ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${scheduleMode === m ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                    color: scheduleMode === m ? "#F5F7FA" : "#8B95A7",
                  }}>{l}</button>
              ))}
            </div>
            {scheduleMode === "later" && (
              <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-[12.5px] outline-none"
                style={FIELD_STYLE} />
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
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: !broadcastName.trim() ? "#8B95A7" : "#F5F7FA", opacity: !broadcastName.trim() ? 0.5 : 1 }}>
            Save Draft
          </button>
          <button onClick={() => handleSend("send")} disabled={submitting || !canSend}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: "#6C63FF", opacity: (submitting || !canSend) ? 0.5 : 1 }}>
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> {scheduleMode === "later" ? "Scheduling…" : "Sending…"}</>
              : scheduleMode === "later"
              ? <><Send size={14} /> Schedule Broadcast</>
              : <>
                  <Send size={14} /> Send Now
                  {reachableLoading
                    ? <span className="ml-1 opacity-60 text-[12px] font-normal">— counting…</span>
                    : reachable !== null
                    ? reachable.windowOpen > 0
                      ? <span className="ml-1 text-[12px] font-normal">
                          — 🔥 <strong style={{ fontWeight: 700 }}>{reachable.windowOpen.toLocaleString()} Reachable Customers</strong>
                        </span>
                      : <span className="ml-1 text-[12px] font-normal" style={{ opacity: 0.75 }}>
                          — <strong style={{ fontWeight: 700 }}>0 Reachable</strong> (24h window closed)
                        </span>
                    : null}
                </>}
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
