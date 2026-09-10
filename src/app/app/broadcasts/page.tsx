"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Radio, X, Check, AlertCircle, Search, Circle, FileText, Users, Send, Loader2, ExternalLink } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

// ── Types ──────────────────────────────────────────────────────────────────────

type FieldType = "TEXT" | "NUMBER" | "URL" | "DATE" | "CURRENCY" | "TEXTAREA" | "DROPDOWN";

interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  maxLength?: number;
  placeholder?: string;
  options?: string[];
}

interface GlobalTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  fields: TemplateField[] | null;
  category: string | null;
}

interface UserTemplate {
  id: string;
  name: string;
  content: string;
  fields: TemplateField[] | null;
  category: string | null;
  usageCount: number;
}

interface ContactItem {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  metaUserId: string;
  pageId: string;
  lastMessageAt: string | null;
}

type BroadcastItem = {
  id: string;
  name: string;
  status: string;
  pageId: string | null;
  templateId: string | null;
  messageTemplateId: string | null;
  templateName: string | null;
  message: string | null;
  fieldValues: Record<string, string> | null;
  scheduledAt: string | null;
  createdAt: string;
  sent?: number;
  failed?: number;
  totalRecipients?: number;
  ineligibleCount?: number;
  skippedCount?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  _count?: { recipients: number };
};

interface EligibilityResult {
  total: number;
  eligible: number;
  ineligible: number;
  skipped: number;
}

// Template union used inside the wizard
type SelectedTemplate =
  | { source: "global"; data: GlobalTemplate }
  | { source: "user"; data: UserTemplate };

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
  scheduled: { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
  sending:   { bg: "rgba(108,99,255,0.1)",  color: "#8B85FF" },
  completed: { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
  failed:    { bg: "rgba(239,68,68,0.1)",   color: "#EF4444" },
};

/** Keys automatically resolved from contact/page data — not filled by user. */
const CONTACT_VARS = new Set(["first_name", "last_name", "name", "page_name"]);

const CONTACT_VAR_SAMPLES: Record<string, string> = {
  first_name: "Alex",
  last_name: "Johnson",
  name: "Alex Johnson",
  page_name: "Your Page",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderPreview(content: string, values: Record<string, string>, pageName?: string): string {
  const samples: Record<string, string> = {
    ...CONTACT_VAR_SAMPLES,
    ...(pageName ? { page_name: pageName } : {}),
    ...values,
  };
  // Contact vars always win over custom values in preview
  for (const k of CONTACT_VARS) {
    if (CONTACT_VAR_SAMPLES[k]) samples[k] = pageName && k === "page_name" ? pageName : CONTACT_VAR_SAMPLES[k];
  }
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => samples[key] ?? `{{${key}}}`);
}

function windowStatus(c: ContactItem): "open" | "closed" | "unknown" {
  if (!c.lastMessageAt) return "unknown";
  return new Date(c.lastMessageAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 ? "open" : "closed";
}

function contactDisplayName(c: ContactItem): string {
  if (c.name) return c.name;
  const parts = [c.firstName, c.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return c.metaUserId.slice(0, 12) + "…";
}

// ── Field Input ────────────────────────────────────────────────────────────────

function FieldInput({ field, value, onChange }: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base = "w-full px-3 py-2.5 rounded-lg text-[13px] outline-none";
  const style = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };

  if (field.type === "TEXTAREA") {
    return <textarea rows={3} className={`${base} resize-none`} style={style} placeholder={field.placeholder ?? ""} maxLength={field.maxLength} value={value} onChange={e => onChange(e.target.value)} />;
  }
  if (field.type === "DROPDOWN" && field.options?.length) {
    return (
      <select className={base} style={style} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  const inputType = field.type === "DATE" ? "date"
    : (field.type === "NUMBER" || field.type === "CURRENCY") ? "text"
    : field.type === "URL" ? "url" : "text";
  return <input type={inputType} className={base} style={style} placeholder={field.placeholder ?? (field.type === "CURRENCY" ? "0.00" : field.type === "URL" ? "https://" : "")} maxLength={field.maxLength} value={value} onChange={e => onChange(e.target.value)} />;
}

function validateFieldValue(type: FieldType, value: string): string | null {
  if (!value.trim()) return null;
  if (type === "URL") {
    try {
      const u = new URL(value);
      if (u.protocol !== "https:" && u.protocol !== "http:") return "URL must start with https://";
      return null;
    } catch { return "Expected a URL starting with https://"; }
  }
  if (type === "DATE") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return "Required format: YYYY-MM-DD (e.g. 2026-12-31)";
    const d = new Date(value.trim() + "T00:00:00");
    if (isNaN(d.getTime())) return "Invalid date — use YYYY-MM-DD";
    return null;
  }
  if (type === "NUMBER" || type === "CURRENCY") {
    if (isNaN(Number(value))) return "Expected a number (e.g. 50 or 9.99)";
    return null;
  }
  return null;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text", TEXTAREA: "Text", NUMBER: "Number", CURRENCY: "Currency",
  URL: "URL", DATE: "Date", DROPDOWN: "Choice",
};

// ── Draft Detail / Send Modal ─────────────────────────────────────────────────

interface EnrichedBroadcast extends BroadcastItem {
  template?: { fields: TemplateField[] | null; content: string } | null;
  messageTemplate?: { fields: TemplateField[] | null; content: string } | null;
}

interface TestResult {
  contactId: string;
  name: string;
  success: boolean;
  error: string | null;
}

function DraftDetailModal({ broadcast: initialBroadcast, onClose, onSent }: {
  broadcast: BroadcastItem;
  onClose: () => void;
  onSent: (updated: BroadcastItem) => void;
}) {
  const { pages } = useWorkspace();

  const [broadcast, setBroadcast] = useState<EnrichedBroadcast>(initialBroadcast);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>(initialBroadcast.fieldValues ?? {});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [testOpen, setTestOpen] = useState(false);
  const [testContacts, setTestContacts] = useState<ContactItem[]>([]);
  const [testContactsLoading, setTestContactsLoading] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [testSelected, setTestSelected] = useState<Set<string>>(new Set());
  const [testSending, setTestSending] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testError, setTestError] = useState("");

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; ineligible: number; status: string; queued?: boolean; message?: string } | null>(null);
  const [sendError, setSendError] = useState("");

  const page = pages.find(p => p.id === broadcast.pageId);
  const recipientCount = broadcast.totalRecipients ?? broadcast._count?.recipients ?? 0;

  // Determine if this is a user-template or global-template broadcast
  const isUserTemplate = !!broadcast.messageTemplateId;
  const activeTemplateData = isUserTemplate ? broadcast.messageTemplate : broadcast.template;
  const rawContent = activeTemplateData?.content ?? "";

  // For user templates: only show custom (non-contact) fields
  const allTemplateFields = (activeTemplateData?.fields ?? []) as TemplateField[];
  const templateFields = isUserTemplate
    ? allTemplateFields.filter(f => !CONTACT_VARS.has(f.key))
    : allTemplateFields;
  const contactVarsInTemplate = isUserTemplate
    ? allTemplateFields.filter(f => CONTACT_VARS.has(f.key))
    : [];

  // Live preview: for user templates substitute contact vars with samples + custom values
  const renderedMessage = rawContent
    ? renderPreview(rawContent, editValues, page?.name)
    : (broadcast.message ?? "");

  const isBusy = saving || sending || testSending;

  useEffect(() => {
    fetch(`/api/broadcasts/${initialBroadcast.id}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcast?: EnrichedBroadcast } | null) => {
        if (d?.broadcast) {
          setBroadcast(d.broadcast);
          setEditValues(prev => Object.keys(prev).length ? prev : (d.broadcast!.fieldValues ?? {}));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDetails(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!testOpen || !broadcast.pageId) return;
    setTestContactsLoading(true);
    const p = new URLSearchParams({ pageId: broadcast.pageId, limit: "50" });
    if (testSearch) p.set("search", testSearch);
    fetch(`/api/contacts?${p}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { contacts?: ContactItem[] } | null) => { if (d?.contacts) setTestContacts(d.contacts); })
      .catch(() => {})
      .finally(() => setTestContactsLoading(false));
  }, [testOpen, testSearch, broadcast.pageId]);

  const handleFieldChange = (key: string, val: string) => {
    setEditValues(prev => ({ ...prev, [key]: val }));
    setDirty(true);
    setSaveError("");
  };

  const handleSaveCorrections = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/broadcasts/${broadcast.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldValues: editValues }),
      });
      const d = await res.json() as { broadcast?: BroadcastItem; error?: string };
      if (res.ok && d.broadcast) {
        setBroadcast(prev => ({ ...prev, ...d.broadcast, template: prev.template, messageTemplate: prev.messageTemplate }));
        setDirty(false);
      } else {
        setSaveError(d.error ?? "Failed to save changes.");
      }
    } catch {
      setSaveError("Network error saving changes.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTestContact = (id: string) =>
    setTestSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const handleTestSend = async () => {
    if (testSelected.size === 0) return;
    if (dirty) { setTestError("Save your field corrections first."); return; }
    setTestSending(true);
    setTestError("");
    setTestResults(null);
    try {
      const res = await fetch(`/api/broadcasts/${broadcast.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: [...testSelected] }),
      });
      const d = await res.json() as { results?: TestResult[]; error?: string };
      if (res.ok && d.results) setTestResults(d.results);
      else setTestError(d.error ?? "Test send failed.");
    } catch {
      setTestError("Network error during test send.");
    } finally {
      setTestSending(false);
    }
  };

  const handleSendAll = async () => {
    if (dirty) { setSendError("Save your field corrections before sending."); return; }
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: "POST" });
      const d = await res.json() as { queued?: boolean; message?: string; status?: string; sent?: number; failed?: number; ineligible?: number; broadcast?: BroadcastItem; error?: string };
      if (res.ok) {
        setSendResult({
          sent: d.sent ?? 0,
          failed: d.failed ?? 0,
          ineligible: d.ineligible ?? 0,
          status: d.status ?? "sending",
          queued: d.queued,
          message: d.message,
        });
        // Update the broadcast in the list to show "sending" status
        onSent({ ...broadcast, status: "sending" } as BroadcastItem);
      } else {
        setSendError(d.error ?? "Failed to send broadcast.");
      }
    } catch {
      setSendError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const inp = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };
  const fieldWarnings = templateFields.filter(f => !!validateFieldValue(f.type, editValues[f.key] ?? "")).length;
  const fieldErrors = templateFields.filter(f => f.required && !(editValues[f.key] ?? "").trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isBusy ? onClose : undefined} />
      <div className="relative w-full max-w-xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{broadcast.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>Draft · {recipientCount} recipients</p>
              {broadcast.templateName && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>
                  {broadcast.templateName}
                </span>
              )}
              {isUserTemplate && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>
                  Personalized
                </span>
              )}
            </div>
          </div>
          {!isBusy && <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>}
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto flex-1 min-h-0">
          {sendResult ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              {sendResult.queued ? (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(108,99,255,0.15)" }}>
                    <Radio size={24} style={{ color: "#8B85FF" }} />
                  </div>
                  <div className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>Queued for delivery</div>
                  <p className="text-[12.5px] text-center max-w-xs leading-relaxed" style={{ color: "#8B95A7" }}>
                    {sendResult.message ?? "The broadcast is queued. The first batch of recipients will be processed within 60 seconds."}
                  </p>
                  <p className="text-[11.5px] text-center max-w-xs" style={{ color: "#8B95A7", opacity: 0.7 }}>
                    Open the broadcast to track live delivery progress.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: sendResult.failed === 0 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.12)" }}>
                    {sendResult.failed === 0 ? <Check size={24} style={{ color: "#10B981" }} /> : <Send size={22} style={{ color: "#F59E0B" }} />}
                  </div>
                  <div className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>
                    {sendResult.status === "completed" ? "Broadcast sent!" : sendResult.status === "sending" ? "Sending…" : "Broadcast failed"}
                  </div>
                  <div className="flex gap-4 text-[13px]">
                    {sendResult.sent > 0 && <span style={{ color: "#10B981" }}>{sendResult.sent} delivered</span>}
                    {sendResult.ineligible > 0 && <span style={{ color: "#F59E0B" }}>{sendResult.ineligible} window closed</span>}
                    {(sendResult.failed - sendResult.ineligible) > 0 && <span style={{ color: "#EF4444" }}>{sendResult.failed - sendResult.ineligible} failed</span>}
                  </div>
                  {sendResult.ineligible > 0 && (
                    <p className="text-[12px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
                      {sendResult.ineligible} recipient{sendResult.ineligible !== 1 ? "s were" : " was"} skipped — their 24-hour Messenger window had closed. No credits were charged for these.
                    </p>
                  )}
                </>
              )}
              <button onClick={onClose} className="mt-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>Done</button>
            </div>
          ) : (
            <>
              {/* Contact variables notice for user-template broadcasts */}
              {isUserTemplate && contactVarsInTemplate.length > 0 && (
                <section className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Check size={12} style={{ color: "#10B981" }} />
                    <span className="text-[11px] font-semibold" style={{ color: "#10B981" }}>Auto-personalized per recipient</span>
                    {loadingDetails && <Loader2 size={10} className="animate-spin" style={{ color: "#10B981" }} />}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contactVarsInTemplate.map(f => (
                      <span key={f.key} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                        {`{{${f.key}}}`}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: "#8B95A7" }}>
                    These are automatically replaced with each recipient&apos;s contact data when the message is sent.
                  </p>
                </section>
              )}

              {/* Editable custom field values */}
              {templateFields.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
                      {isUserTemplate ? "Custom Fields" : "Message Fields"}
                    </span>
                    {!isUserTemplate && loadingDetails && <Loader2 size={12} className="animate-spin" style={{ color: "#8B95A7" }} />}
                    {(fieldWarnings > 0 || fieldErrors > 0) && (
                      <span className="text-[10.5px] flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                        <AlertCircle size={10} />
                        {fieldErrors > 0 ? `${fieldErrors} required missing` : `${fieldWarnings} type warning${fieldWarnings > 1 ? "s" : ""}`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    {templateFields.map(f => {
                      const val = editValues[f.key] ?? "";
                      const typeWarn = validateFieldValue(f.type, val);
                      const missingRequired = f.required && !val.trim();
                      const hasIssue = !!typeWarn || missingRequired;
                      return (
                        <div key={f.key}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <label className="text-[12px] font-medium" style={{ color: "#F5F7FA" }}>
                              {f.label}{f.required && <span style={{ color: "#EF4444" }}>*</span>}
                            </label>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7" }}>{f.key}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>{FIELD_TYPE_LABELS[f.type]}</span>
                            {hasIssue && <AlertCircle size={12} style={{ color: missingRequired ? "#EF4444" : "#F59E0B" }} />}
                          </div>
                          <FieldInput field={f} value={val} onChange={v => handleFieldChange(f.key, v)} />
                          {typeWarn && !missingRequired && <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: "#F59E0B" }}><AlertCircle size={10} /> {typeWarn}</p>}
                          {missingRequired && <p className="text-[11px] mt-1" style={{ color: "#EF4444" }}>This field is required</p>}
                        </div>
                      );
                    })}
                  </div>
                  {dirty && (
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={handleSaveCorrections} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white"
                        style={{ background: "#6C63FF", opacity: saving ? 0.7 : 1 }}>
                        {saving ? <><Loader2 size={11} className="animate-spin" /> Saving…</> : <><Check size={11} /> Save corrections</>}
                      </button>
                      <button onClick={() => { setEditValues(broadcast.fieldValues ?? {}); setDirty(false); setSaveError(""); }}
                        disabled={saving} className="text-[12px]" style={{ color: "#8B95A7" }}>
                        Discard
                      </button>
                      {saveError && <span className="text-[11.5px]" style={{ color: "#EF4444" }}>{saveError}</span>}
                    </div>
                  )}
                  {dirty && <p className="text-[11px] mt-1.5" style={{ color: "#F59E0B" }}>Unsaved changes — save corrections before sending.</p>}
                </section>
              )}

              {/* Rendered Message Preview */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
                    {isUserTemplate ? "Preview (sample contact data)" : "Rendered Message"}
                  </span>
                  {dirty && <span className="text-[10.5px]" style={{ color: "#F59E0B" }}>Preview (unsaved)</span>}
                </div>
                <div className="p-3 rounded-xl text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${dirty ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`, color: "#C8D0DC" }}>
                  {renderedMessage}
                </div>
                {isUserTemplate && (
                  <p className="text-[11px] mt-1.5" style={{ color: "#8B95A7" }}>
                    Contact fields shown with sample values. Each recipient receives their own personalized message.
                  </p>
                )}
              </section>

              {/* Test Send */}
              <section>
                <button onClick={() => { setTestOpen(o => !o); setTestResults(null); setTestError(""); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left"
                  style={{ background: testOpen ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${testOpen ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.07)"}` }}>
                  <div className="flex items-center gap-2">
                    <Users size={13} style={{ color: "#8B85FF" }} />
                    <span className="text-[12.5px] font-medium" style={{ color: "#F5F7FA" }}>Test Send</span>
                    <span className="text-[11px]" style={{ color: "#8B95A7" }}>— send to 1–5 contacts before the full broadcast</span>
                  </div>
                  <span className="text-[11px]" style={{ color: "#8B95A7" }}>{testOpen ? "▲" : "▼"}</span>
                </button>

                {testOpen && (
                  <div className="mt-2 p-4 rounded-xl flex flex-col gap-3"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>
                      {isUserTemplate
                        ? "Sends a personalized message (real contact data) to up to 5 contacts. No DB state changes — recipient statuses stay \"pending\"."
                        : `Sends the exact message to up to 5 contacts. No DB state changes — recipient statuses stay "pending". Use this to verify the message before sending to all ${recipientCount} recipients.`}
                    </p>

                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
                      <input type="text" placeholder="Search contacts…" value={testSearch}
                        onChange={e => setTestSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none" style={inp} />
                    </div>

                    {testContactsLoading ? (
                      <div className="flex items-center gap-2 text-[12px]" style={{ color: "#8B95A7" }}>
                        <Loader2 size={12} className="animate-spin" /> Loading contacts…
                      </div>
                    ) : testContacts.length === 0 ? (
                      <p className="text-[12px]" style={{ color: "#8B95A7" }}>No contacts found.</p>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        {testContacts.slice(0, 20).map(c => {
                          const checked = testSelected.has(c.id);
                          const canAdd = testSelected.size < 5 || checked;
                          const ws = windowStatus(c);
                          const dotColor = ws === "open" ? "#10B981" : ws === "closed" ? "#F59E0B" : "#8B95A7";
                          const dotTitle = ws === "open" ? "Messaging window open" : ws === "closed" ? "Window closed (>24h)" : "No inbound message on record";
                          return (
                            <button key={c.id} onClick={() => canAdd && toggleTestContact(c.id)} disabled={!canAdd}
                              className="flex items-center gap-2.5 p-2 rounded-lg text-left transition-all"
                              style={{ background: checked ? "rgba(108,99,255,0.08)" : "transparent", border: `1px solid ${checked ? "rgba(108,99,255,0.2)" : "transparent"}`, opacity: canAdd ? 1 : 0.4 }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                                style={{ background: checked ? "#6C63FF" : "rgba(255,255,255,0.08)", border: checked ? "none" : "1px solid rgba(255,255,255,0.15)" }}>
                                {checked && <Check size={9} color="#fff" />}
                              </div>
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} title={dotTitle} />
                              <span className="text-[12px]" style={{ color: "#F5F7FA" }}>{contactDisplayName(c)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[10.5px]" style={{ color: "#8B95A7" }}>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#10B981" }} /> Window open</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#F59E0B" }} /> Window closed</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#8B95A7" }} /> Never messaged</span>
                    </div>

                    {testSelected.size > 0 && <p className="text-[11px]" style={{ color: "#8B85FF" }}>{testSelected.size} of 5 selected</p>}

                    {testError && (
                      <div className="p-2.5 rounded-lg flex items-start gap-2 text-[12px]"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                        <AlertCircle size={12} className="mt-0.5 shrink-0" /> {testError}
                      </div>
                    )}

                    {testResults && (
                      <div className="flex flex-col gap-1.5">
                        {testResults.map(r => (
                          <div key={r.contactId} className="flex items-start gap-2 text-[12px]">
                            {r.success ? <Check size={13} style={{ color: "#10B981" }} className="mt-0.5 shrink-0" /> : <AlertCircle size={13} style={{ color: "#EF4444" }} className="mt-0.5 shrink-0" />}
                            <div>
                              <span style={{ color: "#F5F7FA" }}>{r.name}</span>
                              {!r.success && r.error && <span className="ml-1.5 text-[11px]" style={{ color: "#EF4444" }}>{r.error}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={handleTestSend} disabled={testSelected.size === 0 || testSending || dirty}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg text-[12.5px] font-semibold text-white"
                      style={{ background: "rgba(108,99,255,0.7)", opacity: (testSelected.size === 0 || testSending || dirty) ? 0.5 : 1 }}>
                      {testSending ? <><Loader2 size={12} className="animate-spin" /> Sending test…</> : <><Send size={12} /> Send test to {testSelected.size || "?"} contact{testSelected.size !== 1 ? "s" : ""}</>}
                    </button>
                  </div>
                )}
              </section>

              {sendError && (
                <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                  <AlertCircle size={14} className="mt-0.5 shrink-0" /> {sendError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!sendResult && (
          <div className="flex gap-3 px-6 py-4 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            {!isBusy && (
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
                Cancel
              </button>
            )}
            <button onClick={handleSendAll} disabled={isBusy || dirty || fieldErrors > 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: "#6C63FF", opacity: (isBusy || dirty || fieldErrors > 0) ? 0.5 : 1 }}>
              {sending ? <><Loader2 size={14} className="animate-spin" /> Sending to {recipientCount}…</>
                : dirty ? "Save corrections first"
                : fieldErrors > 0 ? "Fix required fields first"
                : <><Send size={14} /> Send to All {recipientCount} Recipients</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New Broadcast Wizard ──────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS: Record<Step, string> = {
  1: "Select Page",
  2: "Audience",
  3: "Eligibility",
  4: "Template",
  5: "Message",
  6: "Launch",
};

function BroadcastWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { pages } = useWorkspace();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");

  // Step 2: Audience
  const [audienceMode, setAudienceMode] = useState<"all" | "specific">("all");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  // Step 3: Eligibility
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState("");

  // Step 4: Template
  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplSearch, setTplSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null);

  // Step 5: Fill Fields
  const [broadcastName, setBroadcastName] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Step 6: Launch
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [schedDate, setSchedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; ineligible: number; status: string; queued?: boolean; message?: string } | null>(null);
  const [error, setError] = useState("");

  const selectedPage = pages.find(p => p.id === pageId);

  const templateContent = selectedTemplate?.data.content ?? "";
  const templateAllFields = (selectedTemplate?.data.fields ?? []) as TemplateField[];
  const isUserTpl = selectedTemplate?.source === "user";
  const customFields = isUserTpl
    ? templateAllFields.filter(f => !CONTACT_VARS.has(f.key))
    : templateAllFields;
  const contactVarsInTpl = isUserTpl
    ? templateAllFields.filter(f => CONTACT_VARS.has(f.key))
    : [];
  const previewMessage = templateContent
    ? renderPreview(templateContent, fieldValues, selectedPage?.name)
    : "";

  // Step 2: load contacts for specific mode
  useEffect(() => {
    if (step !== 2 || !pageId || audienceMode !== "specific") return;
    setContactsLoading(true);
    const params = new URLSearchParams({ pageId, limit: "100" });
    if (contactSearch) params.set("search", contactSearch);
    fetch(`/api/contacts?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { contacts?: ContactItem[] } | null) => { if (d?.contacts) setContacts(d.contacts); })
      .catch(() => {})
      .finally(() => setContactsLoading(false));
  }, [step, pageId, contactSearch, audienceMode]);

  // Step 3: run eligibility check
  useEffect(() => {
    if (step !== 3) return;
    setEligibilityLoading(true);
    setEligibilityError("");
    setEligibility(null);
    const body: Record<string, unknown> = { pageId };
    if (audienceMode === "specific") body.contactIds = [...selectedContacts];
    fetch("/api/broadcasts/eligibility-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(r => r.ok ? r.json() : r.json().then((d: { error?: string }) => Promise.reject(d.error ?? "Check failed")))
      .then((d: EligibilityResult) => setEligibility(d))
      .catch((e: unknown) => setEligibilityError(typeof e === "string" ? e : "Failed to run eligibility check"))
      .finally(() => setEligibilityLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Step 4: load templates
  useEffect(() => {
    if (step !== 4) return;
    setTplLoading(true);
    const params = new URLSearchParams();
    if (tplSearch) params.set("search", tplSearch);
    Promise.all([
      fetch(`/api/broadcast-templates?${params}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/templates?limit=50${tplSearch ? `&search=${encodeURIComponent(tplSearch)}` : ""}`).then(r => r.ok ? r.json() : null),
    ]).then(([global, user]) => {
      if (global?.templates) setGlobalTemplates(global.templates as GlobalTemplate[]);
      if (user?.templates) setUserTemplates(user.templates as UserTemplate[]);
    }).catch(() => {}).finally(() => setTplLoading(false));
  }, [step, tplSearch]);

  // Reset field values when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const initial: Record<string, string> = {};
      customFields.forEach(f => { initial[f.key] = ""; });
      setFieldValues(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);

  const fieldsValid = (): boolean => {
    for (const f of customFields) {
      if (f.required && !(fieldValues[f.key] ?? "").trim()) return false;
    }
    return true;
  };

  const canAdvance = (): boolean => {
    if (step === 1) return !!pageId;
    if (step === 2) return audienceMode === "all" || selectedContacts.size > 0;
    if (step === 3) return !eligibilityLoading && !!eligibility && eligibility.eligible > 0;
    if (step === 4) return !!selectedTemplate;
    if (step === 5) return !!broadcastName.trim() && fieldsValid();
    return !saving && !sending;
  };

  const createAndSend = async (mode: "send" | "schedule" | "draft") => {
    if (!selectedTemplate || !pageId) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name: broadcastName.trim(),
        pageId,
        fieldValues,
      };
      if (audienceMode === "all") {
        body.allPageContacts = true;
      } else {
        body.contactIds = [...selectedContacts];
      }
      if (selectedTemplate.source === "global") {
        body.templateId = selectedTemplate.data.id;
      } else {
        body.messageTemplateId = selectedTemplate.data.id;
      }
      if (mode === "schedule" && schedDate) body.scheduledAt = schedDate;

      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to create broadcast.");
        return;
      }

      const { broadcast } = await res.json() as { broadcast: { id: string } };
      setDraftId(broadcast.id);

      if (mode === "draft") {
        setSendResult({ sent: 0, failed: 0, ineligible: 0, status: "draft" });
        onCreated();
        return;
      }

      if (mode === "schedule") {
        setSendResult({ sent: 0, failed: 0, ineligible: 0, status: "scheduled" });
        onCreated();
        return;
      }

      setSaving(false);
      setSending(true);
      const sendRes = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: "POST" });
      const sendData = await sendRes.json() as { queued?: boolean; message?: string; status?: string; sent?: number; failed?: number; ineligible?: number; error?: string };

      if (!sendRes.ok) {
        setError(sendData.error ?? "Broadcast saved as draft but sending failed.");
        onCreated();
        return;
      }

      setSendResult({
        sent: sendData.sent ?? 0,
        failed: sendData.failed ?? 0,
        ineligible: sendData.ineligible ?? 0,
        status: sendData.status ?? "sending",
        queued: sendData.queued,
        message: sendData.message,
      });
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  const goNext = () => {
    if (step < 6) setStep(s => (s + 1) as Step);
  };

  const inp = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };
  const isBusy = saving || sending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isBusy ? onClose : undefined} />
      <div className="relative w-full max-w-xl rounded-2xl overflow-hidden flex flex-col max-h-[88vh]"
        style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>New Broadcast</h2>
            {!sendResult && <p className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>Step {step} of 6 — {STEP_LABELS[step]}</p>}
          </div>
          {!isBusy && <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>}
        </div>

        {/* Step indicator */}
        {!sendResult && (
          <div className="flex items-center px-6 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {([1, 2, 3, 4, 5, 6] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{
                  background: step > s ? "#10B981" : step === s ? "#6C63FF" : "rgba(255,255,255,0.06)",
                  color: step >= s ? "#fff" : "#8B95A7",
                }}>
                  {step > s ? <Check size={10} /> : s}
                </div>
                {i < 5 && <div className="flex-1 h-px" style={{ background: step > s ? "#10B981" : "rgba(255,255,255,0.07)" }} />}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        {sendResult ? (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: sendResult.queued ? "rgba(108,99,255,0.15)" : sendResult.status === "completed" ? "rgba(16,185,129,0.15)" : sendResult.status === "draft" ? "rgba(139,149,167,0.1)" : "rgba(245,158,11,0.1)" }}>
              {sendResult.queued ? <Radio size={24} style={{ color: "#8B85FF" }} />
                : sendResult.status === "completed" ? <Check size={24} style={{ color: "#10B981" }} />
                : sendResult.status === "draft" ? <FileText size={22} style={{ color: "#8B95A7" }} />
                : <Circle size={22} style={{ color: "#F59E0B" }} />}
            </div>
            <div className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>
              {sendResult.queued ? "Queued for delivery"
                : sendResult.status === "completed" ? "Broadcast sent!"
                : sendResult.status === "draft" ? "Saved as draft"
                : "Scheduled!"}
            </div>
            {sendResult.queued && (
              <p className="text-[12.5px] text-center max-w-xs leading-relaxed" style={{ color: "#8B95A7" }}>
                {sendResult.message ?? "The first batch processes within 60 seconds. Open the broadcast to track live delivery progress."}
              </p>
            )}
            {sendResult.status === "completed" && !sendResult.queued && (
              <div className="flex items-center gap-4 text-[13px]">
                <span style={{ color: "#10B981" }}>{sendResult.sent} sent</span>
                {sendResult.ineligible > 0 && <span style={{ color: "#F59E0B" }}>{sendResult.ineligible} window closed</span>}
                {(sendResult.failed - sendResult.ineligible) > 0 && <span style={{ color: "#EF4444" }}>{sendResult.failed - sendResult.ineligible} failed</span>}
              </div>
            )}
            {sendResult.status === "draft" && (
              <p className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
                Open it from the Broadcasts list to send when ready.
              </p>
            )}
            <button onClick={onClose} className="mt-1 px-5 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>Done</button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">

              {/* Step 1: Select Page */}
              {step === 1 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Select Facebook Page</p>
                  {pages.length === 0 ? (
                    <div className="p-4 rounded-xl text-[13px]" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                      No connected pages. Connect a Facebook Page first.
                    </div>
                  ) : pages.map(p => (
                    <button key={p.id} onClick={() => setPageId(p.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-all text-left"
                      style={{ background: pageId === p.id ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${pageId === p.id ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: p.color }}>{p.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{p.name}</div>
                      </div>
                      {pageId === p.id && <Check size={14} style={{ color: "#6C63FF" }} />}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Audience */}
              {step === 2 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Select Audience</p>
                  <div className="flex flex-col gap-2 mb-4">
                    {(["all", "specific"] as const).map(mode => (
                      <button key={mode} onClick={() => { setAudienceMode(mode); setSelectedContacts(new Set()); }}
                        className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                        style={{ background: audienceMode === mode ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${audienceMode === mode ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{ borderColor: audienceMode === mode ? "#6C63FF" : "rgba(255,255,255,0.2)" }}>
                          {audienceMode === mode && <div className="w-2 h-2 rounded-full" style={{ background: "#6C63FF" }} />}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>
                            {mode === "all" ? "All page contacts" : "Specific contacts"}
                          </div>
                          <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>
                            {mode === "all" ? "Every contact on this page — eligibility checked in next step" : "Manually select which contacts to include"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {audienceMode === "specific" && (
                    <>
                      <div className="relative mb-3">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
                        <input type="text" placeholder="Search contacts…" value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none" style={inp} />
                      </div>
                      {contactsLoading ? (
                        <div className="flex flex-col gap-2">
                          {[1, 2, 3, 4].map(i => <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
                        </div>
                      ) : contacts.length === 0 ? (
                        <div className="py-8 text-center text-[13px]" style={{ color: "#8B95A7" }}>
                          {contactSearch ? "No contacts match your search." : "No contacts found. Scan the page first."}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px]" style={{ color: "#8B95A7" }}>{contacts.length} contacts</span>
                            <button onClick={() => setSelectedContacts(prev => prev.size === contacts.length ? new Set() : new Set(contacts.map(c => c.id)))}
                              className="text-[11px]" style={{ color: "#6C63FF" }}>
                              {selectedContacts.size === contacts.length ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
                            {contacts.map(c => {
                              const checked = selectedContacts.has(c.id);
                              const ws = windowStatus(c);
                              const dotColor = ws === "open" ? "#10B981" : ws === "closed" ? "#F59E0B" : "#8B95A7";
                              return (
                                <button key={c.id} onClick={() => setSelectedContacts(prev => {
                                  const next = new Set(prev);
                                  next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                  return next;
                                })}
                                  className="flex items-center gap-3 p-2.5 rounded-lg text-left transition-all"
                                  style={{ background: checked ? "rgba(108,99,255,0.08)" : "transparent", border: `1px solid ${checked ? "rgba(108,99,255,0.2)" : "transparent"}` }}>
                                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                                    style={{ background: checked ? "#6C63FF" : "rgba(255,255,255,0.06)", border: checked ? "none" : "1px solid rgba(255,255,255,0.12)" }}>
                                    {checked && <Check size={10} color="#fff" />}
                                  </div>
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }}
                                    title={ws === "open" ? "Window open" : ws === "closed" ? "Window closed (>24h)" : "Never messaged"} />
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>
                                    {contactDisplayName(c).charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>{contactDisplayName(c)}</span>
                                </button>
                              );
                            })}
                          </div>
                          {selectedContacts.size > 0 && (
                            <div className="mt-3 text-[12px]" style={{ color: "#6C63FF" }}>
                              <Users size={11} className="inline mr-1" />{selectedContacts.size} contact{selectedContacts.size !== 1 ? "s" : ""} selected
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Eligibility Check */}
              {step === 3 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Eligibility Check</p>
                  <p className="text-[12.5px] mb-4" style={{ color: "#8B95A7" }}>
                    Checking which contacts can receive a message right now based on the 24-hour Messenger window and subscription status.
                  </p>
                  {eligibilityLoading ? (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <Loader2 size={18} className="animate-spin" style={{ color: "#6C63FF" }} />
                      <span className="text-[13px]" style={{ color: "#8B95A7" }}>Running eligibility check…</span>
                    </div>
                  ) : eligibilityError ? (
                    <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                      <AlertCircle size={14} className="mt-0.5 shrink-0" /> {eligibilityError}
                    </div>
                  ) : eligibility ? (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Total contacts", value: eligibility.total, color: "#F5F7FA", bg: "rgba(255,255,255,0.04)" },
                          { label: "Eligible to receive", value: eligibility.eligible, color: "#10B981", bg: "rgba(16,185,129,0.08)" },
                          { label: "Window closed (>24h)", value: eligibility.ineligible, color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
                          { label: "Unsubscribed", value: eligibility.skipped, color: "#8B95A7", bg: "rgba(139,149,167,0.08)" },
                        ].map(({ label, value, color, bg }) => (
                          <div key={label} className="p-3 rounded-xl text-center" style={{ background: bg, border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="text-[22px] font-bold" style={{ color }}>{value.toLocaleString()}</div>
                            <div className="text-[11px] mt-0.5" style={{ color: "#8B95A7" }}>{label}</div>
                          </div>
                        ))}
                      </div>
                      {eligibility.eligible === 0 ? (
                        <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                          <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          No eligible recipients. No contacts have an open 24-hour Messenger window. Contacts must send a message to your Page first.
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]"
                          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#10B981" }}>
                          <Check size={14} className="mt-0.5 shrink-0" />
                          Ready — {eligibility.eligible.toLocaleString()} eligible contact{eligibility.eligible !== 1 ? "s" : ""} will receive this broadcast.
                          {eligibility.ineligible > 0 && ` ${eligibility.ineligible.toLocaleString()} will be automatically skipped (window closed).`}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Step 4: Choose Template */}
              {step === 4 && (
                <div>
                  <div className="relative mb-3">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
                    <input type="text" placeholder="Search templates…" value={tplSearch}
                      onChange={e => setTplSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none" style={inp} />
                  </div>
                  {tplLoading ? (
                    <div className="flex flex-col gap-2">
                      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
                    </div>
                  ) : (
                    <>
                      {userTemplates.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>My Templates</p>
                          {userTemplates.map(t => {
                            const isSelected = selectedTemplate?.source === "user" && selectedTemplate.data.id === t.id;
                            const customCount = (t.fields ?? []).filter(f => !CONTACT_VARS.has(f.key)).length;
                            const contactCount = (t.fields ?? []).filter(f => CONTACT_VARS.has(f.key)).length;
                            return (
                              <button key={t.id} onClick={() => setSelectedTemplate({ source: "user", data: t })}
                                className="w-full flex items-start gap-3 p-3.5 rounded-xl mb-2 text-left transition-all"
                                style={{ background: isSelected ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isSelected ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(108,99,255,0.12)" }}>
                                  <FileText size={14} style={{ color: "#8B85FF" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</span>
                                    {t.category && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>{t.category}</span>}
                                    {contactCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>Personalized</span>}
                                  </div>
                                  <p className="text-[11px] mt-0.5 truncate font-mono" style={{ color: "#8B95A7" }}>{t.content}</p>
                                  {customCount > 0 && <p className="text-[10.5px] mt-0.5" style={{ color: "#6C63FF" }}>{customCount} custom field{customCount !== 1 ? "s" : ""} to fill</p>}
                                </div>
                                {isSelected && <Check size={14} style={{ color: "#6C63FF" }} className="mt-1 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {globalTemplates.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>Admin Templates</p>
                          {globalTemplates.map(t => {
                            const isSelected = selectedTemplate?.source === "global" && selectedTemplate.data.id === t.id;
                            return (
                              <button key={t.id} onClick={() => setSelectedTemplate({ source: "global", data: t })}
                                className="w-full flex items-start gap-3 p-3.5 rounded-xl mb-2 text-left transition-all"
                                style={{ background: isSelected ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isSelected ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(108,99,255,0.12)" }}>
                                  <FileText size={14} style={{ color: "#8B85FF" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</span>
                                    {t.category && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>{t.category}</span>}
                                  </div>
                                  {t.description && <p className="text-[12px] mt-0.5 truncate" style={{ color: "#8B95A7" }}>{t.description}</p>}
                                  {t.fields && t.fields.length > 0 && <p className="text-[11px] mt-1" style={{ color: "#6C63FF" }}>{t.fields.length} editable field{t.fields.length !== 1 ? "s" : ""}</p>}
                                </div>
                                {isSelected && <Check size={14} style={{ color: "#6C63FF" }} className="mt-1 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {userTemplates.length === 0 && globalTemplates.length === 0 && (
                        <div className="py-8 text-center text-[13px]" style={{ color: "#8B95A7" }}>
                          {tplSearch ? "No templates match your search." : "No templates yet. Create one in Templates, or ask your admin."}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 5: Fill Fields & Preview */}
              {step === 5 && selectedTemplate && (
                <div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7" }}>Broadcast Name *</label>
                    <input value={broadcastName} onChange={e => setBroadcastName(e.target.value)}
                      placeholder="e.g. September Appointment Reminders"
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={inp} />
                  </div>

                  {isUserTpl && contactVarsInTpl.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Check size={12} style={{ color: "#10B981" }} />
                        <span className="text-[11px] font-semibold" style={{ color: "#10B981" }}>Auto-personalized per recipient</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {contactVarsInTpl.map(f => (
                          <span key={f.key} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                            {`{{${f.key}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {customFields.length > 0 ? (
                    <div className="mt-4 flex flex-col gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Fill in the editable fields</p>
                      {customFields.map(f => (
                        <div key={f.key}>
                          <label className="flex items-center gap-1 text-[12px] font-medium mb-1.5" style={{ color: "#F5F7FA" }}>
                            {f.label}{f.required && <span style={{ color: "#EF4444" }}>*</span>}
                            <span className="ml-auto text-[10px]" style={{ color: "#8B95A7" }}>{f.type}</span>
                          </label>
                          <FieldInput field={f} value={fieldValues[f.key] ?? ""}
                            onChange={v => setFieldValues(prev => ({ ...prev, [f.key]: v }))} />
                          {f.maxLength && (
                            <div className="text-right text-[10px] mt-0.5" style={{ color: "#8B95A7" }}>
                              {(fieldValues[f.key] ?? "").length} / {f.maxLength}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : !isUserTpl ? (
                    <div className="mt-4 p-3 rounded-xl text-[12.5px]" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#10B981" }}>
                      This template has no editable fields — the message is fully fixed.
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>
                      {isUserTpl ? "Preview (sample contact data)" : "Live Preview"}
                    </p>
                    <div className="p-3 rounded-xl text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", color: "#C8D0DC" }}>
                      {previewMessage || <span style={{ color: "#8B95A7" }}>(preview appears as you fill in fields)</span>}
                    </div>
                    {isUserTpl && (
                      <p className="text-[10.5px] mt-1.5" style={{ color: "#8B95A7" }}>
                        Contact variables shown with sample values. Each recipient receives their own personalized message.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6: Launch */}
              {step === 6 && selectedTemplate && (
                <div>
                  <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Summary</div>
                    <div className="flex flex-col gap-2 text-[12.5px]">
                      <div className="flex justify-between"><span style={{ color: "#8B95A7" }}>Name</span><span style={{ color: "#F5F7FA" }}>{broadcastName}</span></div>
                      <div className="flex justify-between"><span style={{ color: "#8B95A7" }}>Page</span><span style={{ color: "#F5F7FA" }}>{selectedPage?.name}</span></div>
                      <div className="flex justify-between"><span style={{ color: "#8B95A7" }}>Template</span>
                        <span className="flex items-center gap-1.5" style={{ color: "#F5F7FA" }}>
                          {selectedTemplate.data.name}
                          {isUserTpl && <span className="text-[9.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>Personalized</span>}
                        </span>
                      </div>
                      <div className="flex justify-between"><span style={{ color: "#8B95A7" }}>Audience</span>
                        <span style={{ color: "#F5F7FA" }}>
                          {audienceMode === "all" ? "All page contacts" : `${selectedContacts.size} selected contacts`}
                        </span>
                      </div>
                      {eligibility && (
                        <div className="flex justify-between"><span style={{ color: "#8B95A7" }}>Eligible</span>
                          <span style={{ color: "#10B981" }}>{eligibility.eligible.toLocaleString()} of {eligibility.total.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>
                      {isUserTpl ? "Preview (sample contact data)" : "Final Message"}
                    </div>
                    <div className="p-3 rounded-xl text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", color: "#C8D0DC" }}>
                      {previewMessage}
                    </div>
                    {isUserTpl && (
                      <p className="text-[10.5px] mt-1.5" style={{ color: "#8B95A7" }}>
                        Each recipient will receive a personalized version.
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>When to send</div>
                    <div className="flex flex-col gap-2">
                      {(["now", "later"] as const).map(s => (
                        <button key={s} onClick={() => setSchedule(s)} className="flex items-center gap-3 p-3 rounded-xl text-left"
                          style={{ background: schedule === s ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${schedule === s ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                          <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                            style={{ borderColor: schedule === s ? "#6C63FF" : "rgba(255,255,255,0.2)" }}>
                            {schedule === s && <div className="w-2 h-2 rounded-full" style={{ background: "#6C63FF" }} />}
                          </div>
                          <span className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>
                            {s === "now" ? "Send Now" : "Schedule for later"}
                          </span>
                        </button>
                      ))}
                    </div>
                    {schedule === "later" && (
                      <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none mt-2" style={inp} />
                    )}
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                      <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                    </div>
                  )}
                  {draftId && error && (
                    <p className="text-[11.5px] mt-2" style={{ color: "#8B95A7" }}>
                      Your broadcast was saved. You can retry sending from the broadcasts list.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              {step === 6 ? (
                <div className="flex flex-col gap-2 px-6 py-4">
                  {!isBusy && (
                    <div className="flex gap-3">
                      <button onClick={() => setStep(5)}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
                        Back
                      </button>
                      <button onClick={() => createAndSend("draft")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-medium"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
                        <FileText size={13} /> Save as Draft
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => createAndSend(schedule === "now" ? "send" : "schedule")}
                    disabled={isBusy || (schedule === "later" && !schedDate)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                    style={{ background: "#6C63FF", opacity: (isBusy || (schedule === "later" && !schedDate)) ? 0.5 : 1 }}>
                    {sending ? <><Loader2 size={14} className="animate-spin" /> Sending to {eligibility?.eligible ?? 0}…</>
                      : saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                      : schedule === "now" ? <><Send size={14} /> Send Now to {eligibility?.eligible ?? 0} contacts</>
                      : <><Circle size={14} /> Schedule Broadcast</>}
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 px-6 py-4">
                  {step > 1 && !isBusy && (
                    <button onClick={() => setStep(s => (s - 1) as Step)}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
                      Back
                    </button>
                  )}
                  <button onClick={goNext} disabled={!canAdvance()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                    style={{ background: "#6C63FF", opacity: canAdvance() ? 1 : 0.4 }}>
                    {step === 3 && eligibilityLoading ? <><Loader2 size={14} className="animate-spin" /> Checking…</>
                      : step === 3 && eligibility?.eligible === 0 ? "No eligible recipients"
                      : "Continue"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabKey = "all" | "sending" | "scheduled" | "completed" | "failed" | "draft";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "sending", label: "Sending" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
  { key: "draft", label: "Drafts" },
];

export default function BroadcastsPage() {
  const { pages } = useWorkspace();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<BroadcastItem | null>(null);

  const handleDraftSent = (updated: BroadcastItem) => {
    setBroadcasts(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (activeTab !== "all") params.set("status", activeTab);
    fetch(`/api/broadcasts?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcasts?: BroadcastItem[] } | null) => { if (d?.broadcasts) setBroadcasts(d.broadcasts ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTab]);

  const reload = () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (activeTab !== "all") params.set("status", activeTab);
    fetch(`/api/broadcasts?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcasts?: BroadcastItem[] } | null) => { if (d?.broadcasts) setBroadcasts(d.broadcasts ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Broadcasts</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Send personalized bulk messages using your templates or admin-approved templates.</p>
        </div>
        <button onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF" }}>
          <Plus size={14} /> New Broadcast
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium shrink-0 transition-all"
            style={{
              background: activeTab === tab.key ? "rgba(108,99,255,0.12)" : "transparent",
              color: activeTab === tab.key ? "#8B85FF" : "#8B95A7",
              border: `1px solid ${activeTab === tab.key ? "rgba(108,99,255,0.25)" : "transparent"}`,
            }}>
            {tab.label}
          </button>
        ))}
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
          <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>
            {activeTab === "all" ? "No broadcasts yet" : `No ${activeTab} broadcasts`}
          </div>
          <div className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
            {activeTab === "all"
              ? "Create your first broadcast using your message templates or an admin-approved template."
              : `No broadcasts with status "${activeTab}" found.`}
          </div>
          {activeTab === "all" && (
            <button onClick={() => setShowWizard(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: "#6C63FF" }}>
              <Plus size={14} /> Create Broadcast
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Name", "Page", "Template", "Status", "Total", "Sent", "Ineligible", "Skipped", "Created", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "#8B95A7" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((b, i) => {
                  const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.draft;
                  const isDraft = b.status === "draft";
                  const handleClick = () => {
                    if (isDraft) setSelectedDraft(b);
                    else router.push(`/app/broadcasts/${b.id}`);
                  };
                  return (
                    <tr key={b.id}
                      onClick={handleClick}
                      className="cursor-pointer"
                      style={{
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(108,99,255,0.05)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; }}
                    >
                      <td className="px-4 py-3" style={{ color: "#F5F7FA" }}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium whitespace-nowrap">{b.name}</span>
                          {isDraft && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                              style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF" }}>
                              <Send size={8} /> Send
                            </span>
                          )}
                          {b.messageTemplateId && (
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>P</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#8B95A7" }}>{pages.find(p => p.id === b.pageId)?.name ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#8B95A7" }}>{b.templateName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold capitalize whitespace-nowrap"
                          style={{ background: sc.bg, color: sc.color }}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "#8B95A7" }}>
                        {(b.totalRecipients ?? b._count?.recipients ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: b.status === "completed" ? "#10B981" : "#8B95A7" }}>
                        {b.status === "completed" ? (b.sent ?? 0).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "#F59E0B" }}>
                        {b.status === "completed" && (b.ineligibleCount ?? 0) > 0 ? (b.ineligibleCount ?? 0).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "#8B95A7" }}>
                        {b.status === "completed" && (b.skippedCount ?? 0) > 0 ? (b.skippedCount ?? 0).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#8B95A7" }}>{fmt(b.createdAt)}</td>
                      <td className="px-4 py-3">
                        {!isDraft && <ExternalLink size={13} style={{ color: "#8B95A7", opacity: 0.5 }} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-[11px]" style={{ color: "rgba(139,149,167,0.5)" }}>
            Click a <span style={{ color: "#8B85FF" }}>draft</span> row to open and send · Click any other row to view details
          </p>
        </div>
      )}

      {showWizard && <BroadcastWizard onClose={() => setShowWizard(false)} onCreated={() => { reload(); setShowWizard(false); }} />}
      {selectedDraft && (
        <DraftDetailModal
          broadcast={selectedDraft}
          onClose={() => setSelectedDraft(null)}
          onSent={updated => {
            handleDraftSent(updated);
            setSelectedDraft(null);
          }}
        />
      )}
    </div>
  );
}
