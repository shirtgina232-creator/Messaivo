"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X, ChevronRight, ChevronLeft, Users, FileText, Eye, CheckCircle2,
  Send, Loader2, AlertCircle, RefreshCw, ArrowRight, ExternalLink,
  Zap, Check,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Page { id: string; name: string; pageId?: string; isActive?: boolean }

interface UtilityTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  isUtility?: boolean;
  fields: Array<{ key: string; label?: string; example?: string }> | null;
  metaTemplateName: string | null;
  metaTemplateStatus: string | null; // "APPROVED" | "PENDING" | "REJECTED" etc.
  registeredForPageId: string | null;
}

interface EligibilityResult {
  total: number;
  windowOpen: number;
  windowClosed: number;
  neverMessaged: number;
  unsubscribed: number;
}

interface ProgressData {
  status: string;
  total: number;
  sent: number;
  failed: number;
  ineligible: number;
  skipped: number;
  percentComplete: number;
  estimatedSecondsLeft: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CONTACT_SAMPLE: Record<string, string> = {
  first_name: "Jane", last_name: "Smith", name: "Jane Smith", page_name: "Your Page",
};
const CONTACT_VARS = new Set(["first_name", "last_name", "name", "page_name"]);

function renderPreview(content: string, pageName: string): string {
  const contactSamples = { ...CONTACT_SAMPLE, page_name: pageName };
  return content.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    k in contactSamples ? (contactSamples as Record<string, string>)[k] : `{{${k}}}`
  );
}

function extractCustomVars(content: string): string[] {
  const seen = new Set<string>();
  for (const [, k] of content.matchAll(/\{\{(\w+)\}\}/g)) {
    if (!CONTACT_VARS.has(k)) seen.add(k);
  }
  return [...seen];
}

const CARD_STYLE = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
};

// ── Step Indicator ─────────────────────────────────────────────────────────────

const STEPS = ["Page", "Template", "Preview", "Confirm"] as const;

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 w-full px-6 py-4 shrink-0"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                background: i < step ? "#10B981" : i === step ? "#6C63FF" : "rgba(255,255,255,0.07)",
                color: i <= step ? "#fff" : "#8B95A7",
                border: i === step ? "2px solid rgba(108,99,255,0.5)" : "none",
              }}>
              {i < step ? <Check size={11} /> : i + 1}
            </div>
            <span className="text-[11.5px] font-medium hidden sm:block"
              style={{ color: i === step ? "#F5F7FA" : i < step ? "#10B981" : "#8B95A7" }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-px mx-2" style={{ background: i < step ? "#10B981" : "rgba(255,255,255,0.08)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Select Page ───────────────────────────────────────────────────────

function Step1Page({ pages, selectedId, onSelect, eligibility, loading }: {
  pages: Page[];
  selectedId: string;
  onSelect: (id: string) => void;
  eligibility: EligibilityResult | null;
  loading: boolean;
}) {
  const utilityEligible = (eligibility?.windowOpen ?? 0) + (eligibility?.windowClosed ?? 0);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[13px] leading-relaxed" style={{ color: "#C4CDD8" }}>
          Select the Facebook Page whose contacts will receive this broadcast.
          Only contacts who have previously messaged the page can receive utility broadcasts.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {pages.length === 0 ? (
          <p className="text-[13px] py-6 text-center" style={{ color: "#8B95A7" }}>
            No active Facebook Pages connected. Connect a page first.
          </p>
        ) : pages.map(p => (
          <button key={p.id} onClick={() => onSelect(p.id)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors"
            style={{
              background: selectedId === p.id ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${selectedId === p.id ? "rgba(108,99,255,0.4)" : "rgba(255,255,255,0.07)"}`,
            }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0"
              style={{ background: "#6C63FF", color: "#fff" }}>
              {p.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{p.name}</p>
              {p.pageId && <p className="text-[11px] truncate" style={{ color: "#8B95A7" }}>Meta Page ID: {p.pageId}</p>}
            </div>
            {selectedId === p.id && <Check size={16} style={{ color: "#6C63FF", flexShrink: 0 }} />}
          </button>
        ))}
      </div>

      {selectedId && (
        <div className="rounded-xl p-4" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.18)" }}>
          {loading ? (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "#8B95A7" }}>
              <Loader2 size={12} className="animate-spin" /> Counting eligible recipients…
            </div>
          ) : eligibility ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Users size={13} style={{ color: "#8B85FF" }} />
                <span className="text-[12px] font-semibold" style={{ color: "#F5F7FA" }}>
                  {eligibility.total.toLocaleString()} total contacts
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#6C63FF" }} />
                  <span className="text-[11.5px]" style={{ color: "#C4CDD8" }}>
                    <strong style={{ color: "#8B85FF", fontSize: 14 }}>{utilityEligible.toLocaleString()}</strong>
                    {" "}eligible for utility
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#10B981" }} />
                  <span className="text-[11.5px]" style={{ color: "#C4CDD8" }}>
                    <strong style={{ color: "#10B981" }}>{eligibility.windowOpen.toLocaleString()}</strong>
                    {" "}in 24h window
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#F59E0B" }} />
                  <span className="text-[11.5px]" style={{ color: "#C4CDD8" }}>
                    <strong style={{ color: "#F59E0B" }}>{eligibility.windowClosed.toLocaleString()}</strong>
                    {" "}outside 24h window
                  </span>
                </div>
                {(eligibility.neverMessaged + eligibility.unsubscribed) > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#8B95A7" }} />
                    <span className="text-[11.5px]" style={{ color: "#C4CDD8" }}>
                      <strong style={{ color: "#8B95A7" }}>
                        {(eligibility.neverMessaged + eligibility.unsubscribed).toLocaleString()}
                      </strong>
                      {" "}excluded
                    </span>
                  </div>
                )}
              </div>
              {utilityEligible === 0 && (
                <p className="text-[11.5px] mt-1" style={{ color: "#F59E0B" }}>
                  No eligible contacts yet. Contacts become eligible after they send a message to this page.
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Step 2: Select Template ───────────────────────────────────────────────────

function Step2Template({ pageId, selected, onSelect }: {
  pageId: string;
  selected: UtilityTemplate | null;
  onSelect: (t: UtilityTemplate) => void;
}) {
  const [templates, setTemplates] = useState<UtilityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pageId) return;
    setLoading(true); setError("");
    fetch(`/api/broadcast-templates?pageId=${encodeURIComponent(pageId)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d: { templates?: UtilityTemplate[] }) => {
        const approved = (d.templates ?? []).filter(
          t => t.isUtility && t.metaTemplateStatus === "APPROVED"
        );
        setTemplates(approved);
      })
      .catch(() => setError("Failed to load templates."))
      .finally(() => setLoading(false));
  }, [pageId]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed" style={{ color: "#C4CDD8" }}>
        Choose an approved utility template. Templates must be pre-approved by Meta before they can be sent.
        Only transactional content (order updates, reminders, notifications) is permitted — no promotional content.
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[13px]" style={{ color: "#8B95A7" }}>
          <Loader2 size={14} className="animate-spin" /> Loading approved templates…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-3 rounded-lg text-[12px]"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
          <AlertCircle size={13} /> {error}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 rounded-xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <FileText size={28} style={{ color: "#8B95A7", opacity: 0.4 }} />
          <p className="text-[13px] font-medium" style={{ color: "#8B95A7" }}>No approved utility templates</p>
          <p className="text-[11.5px] text-center leading-relaxed max-w-xs" style={{ color: "rgba(139,149,167,0.7)" }}>
            Utility templates must be registered and approved by Meta before broadcasts can be sent.
            Ask an admin to register a template for this page.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map(t => {
            const vars = extractCustomVars(t.content);
            return (
              <button key={t.id} onClick={() => onSelect(t)}
                className="flex flex-col gap-2 px-4 py-3.5 rounded-xl text-left transition-colors"
                style={{
                  background: selected?.id === t.id ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selected?.id === t.id ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[13.5px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{t.name}</span>
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <Check size={9} /> Approved
                    </span>
                  </div>
                  {selected?.id === t.id && <Check size={15} style={{ color: "#10B981", flexShrink: 0 }} />}
                </div>
                {t.description && (
                  <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>{t.description}</p>
                )}
                {/* Content preview */}
                <p className="text-[12px] leading-snug line-clamp-2" style={{ color: "rgba(196,205,216,0.65)" }}>
                  {t.content.slice(0, 120)}{t.content.length > 120 ? "…" : ""}
                </p>
                {vars.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {vars.map(v => (
                      <span key={v} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Preview ───────────────────────────────────────────────────────────

function Step3Preview({ template, page, eligibleCount, broadcastName, onNameChange }: {
  template: UtilityTemplate;
  page: Page;
  eligibleCount: number;
  broadcastName: string;
  onNameChange: (v: string) => void;
}) {
  const vars = extractCustomVars(template.content);
  const previewText = renderPreview(template.content, page.name);
  const hasContactVars = [...template.content.matchAll(/\{\{(\w+)\}\}/g)].some(([, k]) => CONTACT_VARS.has(k));

  return (
    <div className="flex flex-col gap-4">
      {/* Broadcast name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
          Broadcast Name
        </label>
        <input
          value={broadcastName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="e.g. October Appointment Reminders"
          className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
        />
        <p className="text-[11px]" style={{ color: "rgba(139,149,167,0.6)" }}>
          Internal name — not shown to recipients.
        </p>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Page", value: page.name, color: "#8B85FF" },
          { label: "Template", value: template.name, color: "#10B981" },
          { label: "Meta Template", value: template.metaTemplateName ?? "—", color: "#F59E0B" },
          { label: "Eligible Recipients", value: eligibleCount.toLocaleString(), color: "#F5F7FA", bold: true },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-3" style={CARD_STYLE}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "#8B95A7" }}>{s.label}</p>
            <p className="text-[13px] truncate" style={{ color: s.color, fontWeight: s.bold ? 700 : 500 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Variable notice */}
      {(hasContactVars || vars.length > 0) && (
        <div className="flex items-start gap-2 p-3 rounded-lg text-[11.5px]"
          style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)", color: "#A89DFF" }}>
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>
            {hasContactVars && <>Variables like <code className="font-mono">{"{{first_name}}"}</code> will be replaced with each recipient&apos;s real name at send time. </>}
            {vars.length > 0 && <>Custom fields </>}
            The preview below uses sample values.
          </span>
        </div>
      )}

      {/* Message bubble preview */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
          Message Preview <span style={{ color: "rgba(139,149,167,0.5)", fontWeight: 400 }}>— sample: Jane Smith</span>
        </p>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          {/* Chat bubble header */}
          <div className="flex items-center gap-2.5 px-4 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: "#6C63FF", color: "#fff" }}>
              {page.name.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-[12px] font-medium" style={{ color: "#C4CDD8" }}>{page.name}</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.2)" }}>
              UTILITY
            </span>
          </div>
          {/* Bubble */}
          <div className="px-4 py-4 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
              style={{ background: "#6C63FF", color: "#fff" }}>
              {page.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm max-w-[calc(100%-3rem)] whitespace-pre-wrap text-[13.5px] leading-relaxed"
              style={{ background: "rgba(255,255,255,0.06)", color: "#F5F7FA" }}>
              {previewText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Confirm ───────────────────────────────────────────────────────────

function Step4Confirm({ page, template, eligibleCount, totalCount }: {
  page: Page;
  template: UtilityTemplate;
  eligibleCount: number;
  totalCount: number;
}) {
  const excluded = Math.max(0, totalCount - eligibleCount);
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] leading-relaxed" style={{ color: "#C4CDD8" }}>
        Review this broadcast before sending. Only Meta-eligible recipients will receive the message.
      </p>

      {/* Summary card */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
        {[
          { label: "Page",      value: page.name,                   color: "#F5F7FA" },
          { label: "Template",  value: template.name,               color: "#F5F7FA" },
          { label: "Type",      value: "Utility (messaging_type: UTILITY)", color: "#8B85FF" },
        ].map((row, i) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-3"
            style={{ background: "rgba(255,255,255,0.025)", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <span className="text-[12px]" style={{ color: "#8B95A7" }}>{row.label}</span>
            <span className="text-[12.5px] font-medium truncate max-w-[60%] text-right" style={{ color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Recipient counts */}
      <div className="rounded-xl p-5 flex flex-col gap-3"
        style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.2)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Users size={14} style={{ color: "#8B85FF" }} />
          <p className="text-[12px] font-semibold" style={{ color: "#8B95A7" }}>Recipient Summary</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px]" style={{ color: "#C4CDD8" }}>Total contacts on page</span>
          <span className="text-[14px] font-bold tabular-nums" style={{ color: "#F5F7FA" }}>
            {totalCount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px]" style={{ color: "#C4CDD8" }}>Excluded (never messaged / unsubscribed)</span>
          <span className="text-[14px] font-bold tabular-nums" style={{ color: "#8B95A7" }}>
            {excluded.toLocaleString()}
          </span>
        </div>
        <div className="h-px" style={{ background: "rgba(108,99,255,0.2)" }} />
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold" style={{ color: "#8B85FF" }}>Will receive this message</span>
          <span className="text-[20px] font-extrabold tabular-nums" style={{ color: "#8B85FF" }}>
            {eligibleCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Policy notice */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-[11.5px]"
        style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.18)", color: "#F59E0B" }}>
        <AlertCircle size={13} className="mt-0.5 shrink-0" />
        <span>
          This broadcast uses <strong>messaging_type: UTILITY</strong> which is permitted by Meta for
          transactional notifications only (order confirmations, delivery updates, appointment reminders).
          Sending promotional content via utility messaging violates Meta policy.
        </span>
      </div>
    </div>
  );
}

// ── Step 5: Sending (progress) ────────────────────────────────────────────────

function Step5Sending({ broadcastId, onDone }: { broadcastId: string; onDone: () => void }) {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const r = await fetch(`/api/broadcasts/${broadcastId}/progress`);
      if (r.ok) {
        const d = await r.json() as ProgressData;
        setProgress(d);
      }
    } catch { /* ignore */ }
  }, [broadcastId]);

  useEffect(() => {
    fetchProgress();
    pollRef.current = setInterval(fetchProgress, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchProgress]);

  // Stop polling when complete/cancelled/failed
  useEffect(() => {
    if (progress?.status && ["completed", "cancelled", "failed", "needs_review"].includes(progress.status)) {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [progress?.status]);

  const status = progress?.status ?? "sending";
  const pct = progress?.percentComplete ?? 0;
  const sent = progress?.sent ?? 0;
  const failed = progress?.failed ?? 0;
  const total = progress?.total ?? 0;
  const remaining = Math.max(0, total - sent - failed);

  const isActive = status === "sending" || status === "draft";
  const isDone = ["completed", "cancelled", "failed", "needs_review"].includes(status);

  const statusColor = isDone
    ? status === "completed" ? "#10B981" : status === "cancelled" ? "#8B95A7" : "#EF4444"
    : "#8B85FF";

  return (
    <div className="flex flex-col gap-5">
      {/* Status + pct */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="relative w-24 h-24">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
            <circle cx="48" cy="48" r="40" fill="none" stroke={statusColor} strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
              strokeLinecap="round" transform="rotate(-90 48 48)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isActive
              ? <Loader2 size={18} className="animate-spin" style={{ color: statusColor }} />
              : isDone && status === "completed"
              ? <CheckCircle2 size={20} style={{ color: "#10B981" }} />
              : <AlertCircle size={20} style={{ color: statusColor }} />}
            <span className="text-[13px] font-bold mt-0.5" style={{ color: statusColor }}>{pct}%</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[15px] font-semibold capitalize" style={{ color: "#F5F7FA" }}>
            {isDone ? (status === "completed" ? "Broadcast Complete" : status === "cancelled" ? "Cancelled" : "Failed") : "Sending…"}
          </p>
          {isActive && progress?.estimatedSecondsLeft != null && (
            <p className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>
              ~{Math.ceil(progress.estimatedSecondsLeft / 60)} min remaining
            </p>
          )}
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total",     value: total,     color: "#F5F7FA" },
          { label: "Sent",      value: sent,      color: "#10B981" },
          { label: "Failed",    value: failed,    color: "#EF4444" },
          { label: "Remaining", value: remaining, color: "#F59E0B" },
        ].map(s => (
          <div key={s.label} className="flex flex-col gap-0.5 p-3 rounded-lg" style={CARD_STYLE}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{s.label}</p>
            <p className="text-[18px] font-bold tabular-nums" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: statusColor }} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => router.push(`/app/broadcasts/${broadcastId}`)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium"
          style={{ background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.3)", color: "#8B85FF" }}>
          <ExternalLink size={13} /> View Full Details
        </button>
        {isDone && (
          <button onClick={onDone}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: "#6C63FF" }}>
            Done
          </button>
        )}
      </div>

      {isActive && (
        <p className="text-[11.5px] text-center" style={{ color: "rgba(139,149,167,0.6)" }}>
          The cron worker processes recipients in batches. Progress updates every 5 seconds.
        </p>
      )}
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export default function BulkTextWizard({ pages, onClose, onSent }: {
  pages: Page[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [step, setStep] = useState(0); // 0=Page 1=Template 2=Preview 3=Confirm 4=Sending
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const [template, setTemplate] = useState<UtilityTemplate | null>(null);
  const [broadcastName, setBroadcastName] = useState("");
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdBroadcastId, setCreatedBroadcastId] = useState<string | null>(null);

  const selectedPage = pages.find(p => p.id === pageId) ?? null;

  // Fetch eligibility whenever page changes
  useEffect(() => {
    if (!pageId) { setEligibility(null); return; }
    setEligibilityLoading(true);
    fetch("/api/broadcasts/eligibility-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, messagingType: "utility" }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: EligibilityResult | null) => { if (d) setEligibility(d); })
      .catch(() => {})
      .finally(() => setEligibilityLoading(false));
  }, [pageId]);

  // Auto-generate broadcast name when template/page selected
  useEffect(() => {
    if (!template || !selectedPage) return;
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setBroadcastName(`${template.name} – ${selectedPage.name} – ${date}`);
  }, [template?.id, selectedPage?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const utilityEligible = (eligibility?.windowOpen ?? 0) + (eligibility?.windowClosed ?? 0);

  const canAdvance = (() => {
    if (step === 0) return !!pageId;
    if (step === 1) return !!template;
    if (step === 2) return !!broadcastName.trim();
    if (step === 3) return true;
    return false;
  })();

  const handleSend = useCallback(async () => {
    if (!pageId || !template || !broadcastName.trim()) return;
    setSubmitting(true); setSubmitError("");
    try {
      // Create broadcast with utility template
      const body = {
        name: broadcastName.trim(),
        pageId,
        templateId: template.id,
        messagingType: "utility",
        allPageContacts: true,
      };
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setSubmitError(d.error ?? "Failed to create broadcast."); return;
      }
      const { broadcast } = await res.json() as { broadcast: { id: string } };

      // Immediately start sending
      const sendRes = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: "POST" });
      if (!sendRes.ok) {
        const d = await sendRes.json() as { error?: string };
        setSubmitError(d.error ?? "Broadcast created but could not start sending."); return;
      }

      setCreatedBroadcastId(broadcast.id);
      setStep(4);
      onSent();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [pageId, template, broadcastName, onSent]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={step < 4 && !submitting ? onClose : undefined} />

      {/* Panel */}
      <div className="w-full max-w-lg flex flex-col overflow-hidden shadow-2xl"
        style={{ background: "#080F18", borderLeft: "1px solid rgba(255,255,255,0.09)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.3)" }}>
              <Zap size={15} style={{ color: "#8B85FF" }} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Bulk Text</h2>
              <p className="text-[11px]" style={{ color: "#8B95A7" }}>
                Utility broadcast · outside 24h window
              </p>
            </div>
          </div>
          {step < 4 && (
            <button onClick={onClose} disabled={submitting}
              className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "#8B95A7" }}>
              <X size={15} />
            </button>
          )}
        </div>

        {/* Step bar — hidden on sending step */}
        {step < 4 && <StepBar step={step} />}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && (
            <Step1Page
              pages={pages}
              selectedId={pageId}
              onSelect={id => { setPageId(id); setTemplate(null); }}
              eligibility={eligibility}
              loading={eligibilityLoading}
            />
          )}
          {step === 1 && (
            <Step2Template
              pageId={pageId}
              selected={template}
              onSelect={t => setTemplate(t)}
            />
          )}
          {step === 2 && selectedPage && template && (
            <Step3Preview
              template={template}
              page={selectedPage}
              eligibleCount={utilityEligible}
              broadcastName={broadcastName}
              onNameChange={setBroadcastName}
            />
          )}
          {step === 3 && selectedPage && template && (
            <Step4Confirm
              page={selectedPage}
              template={template}
              eligibleCount={utilityEligible}
              totalCount={eligibility?.total ?? 0}
            />
          )}
          {step === 4 && createdBroadcastId && (
            <Step5Sending
              broadcastId={createdBroadcastId}
              onDone={() => { onClose(); }}
            />
          )}

          {/* Submit error */}
          {submitError && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg text-[12px]"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {submitError}
            </div>
          )}
        </div>

        {/* Footer nav — hidden on sending step */}
        {step < 4 && (
          <div className="px-6 py-4 flex items-center gap-3 shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
                <ChevronLeft size={14} /> Back
              </button>
            ) : (
              <button onClick={onClose} disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: canAdvance ? "#6C63FF" : "rgba(108,99,255,0.3)", cursor: canAdvance ? "pointer" : "not-allowed" }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={submitting || !canAdvance}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: submitting ? "rgba(108,99,255,0.4)" : "#6C63FF" }}>
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                  : <><Send size={14} /> Confirm &amp; Send to {utilityEligible.toLocaleString()} Recipients <ArrowRight size={13} /></>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
