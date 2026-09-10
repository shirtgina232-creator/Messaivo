"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Check, AlertCircle, Search, FileText, Users, Send,
  Loader2, ExternalLink, MessageSquare, BookOpen, Clock,
  Calendar, ChevronDown, ChevronRight, LayoutDashboard, Radio,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { SendWorkflow } from "@/components/app/SendWorkflow";

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
  description: string | null;
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

type SelectedTemplate =
  | { source: "global"; data: GlobalTemplate }
  | { source: "user"; data: UserTemplate };

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
  scheduled: { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
  sending:   { bg: "rgba(108,99,255,0.1)",  color: "#8B85FF" },
  completed: { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
  failed:    { bg: "rgba(239,68,68,0.1)",   color: "#EF4444" },
  cancelled: { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", scheduled: "Scheduled", sending: "Sending",
  completed: "Delivered", failed: "Failed", cancelled: "Cancelled",
};

const CONTACT_VARS = new Set(["first_name", "last_name", "name", "page_name"]);
const CONTACT_VAR_SAMPLES: Record<string, string> = {
  first_name: "Alex", last_name: "Johnson", name: "Alex Johnson", page_name: "Your Page",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderPreview(content: string, values: Record<string, string>, pageName?: string): string {
  const samples: Record<string, string> = { ...CONTACT_VAR_SAMPLES, ...(pageName ? { page_name: pageName } : {}), ...values };
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

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

// ── Field Input ────────────────────────────────────────────────────────────────

function FieldInput({ field, value, onChange }: { field: TemplateField; value: string; onChange: (v: string) => void }) {
  const base = "w-full px-3 py-2.5 rounded-lg text-[13px] outline-none";
  const style = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };
  if (field.type === "TEXTAREA")
    return <textarea rows={3} className={`${base} resize-none`} style={style} placeholder={field.placeholder ?? ""} maxLength={field.maxLength} value={value} onChange={e => onChange(e.target.value)} />;
  if (field.type === "DROPDOWN" && field.options?.length)
    return (
      <select className={base} style={style} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  const inputType = field.type === "DATE" ? "date" : (field.type === "NUMBER" || field.type === "CURRENCY") ? "text" : field.type === "URL" ? "url" : "text";
  return <input type={inputType} className={base} style={style} placeholder={field.placeholder ?? (field.type === "CURRENCY" ? "0.00" : field.type === "URL" ? "https://" : "")} maxLength={field.maxLength} value={value} onChange={e => onChange(e.target.value)} />;
}

function validateFieldValue(type: FieldType, value: string): string | null {
  if (!value.trim()) return null;
  if (type === "URL") {
    try { const u = new URL(value); if (u.protocol !== "https:" && u.protocol !== "http:") return "URL must start with https://"; return null; }
    catch { return "Expected a URL starting with https://"; }
  }
  if (type === "DATE") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return "Required format: YYYY-MM-DD";
    if (isNaN(new Date(value.trim() + "T00:00:00").getTime())) return "Invalid date";
    return null;
  }
  if (type === "NUMBER" || type === "CURRENCY") {
    if (isNaN(Number(value))) return "Expected a number";
    return null;
  }
  return null;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text", TEXTAREA: "Text", NUMBER: "Number", CURRENCY: "Currency", URL: "URL", DATE: "Date", DROPDOWN: "Choice",
};

// ── Draft / Send Modal ─────────────────────────────────────────────────────────

interface EnrichedBroadcast extends BroadcastItem {
  template?: { fields: TemplateField[] | null; content: string } | null;
  messageTemplate?: { fields: TemplateField[] | null; content: string } | null;
}

interface TestResult { contactId: string; name: string; success: boolean; error: string | null; }

function DraftDetailModal({ broadcast: initialBroadcast, onClose, onSent }: {
  broadcast: BroadcastItem; onClose: () => void; onSent: (updated: BroadcastItem) => void;
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
  const isUserTemplate = !!broadcast.messageTemplateId;
  const activeTemplateData = isUserTemplate ? broadcast.messageTemplate : broadcast.template;
  const rawContent = activeTemplateData?.content ?? "";
  const allTemplateFields = (activeTemplateData?.fields ?? []) as TemplateField[];
  const templateFields = isUserTemplate ? allTemplateFields.filter(f => !CONTACT_VARS.has(f.key)) : allTemplateFields;
  const contactVarsInTemplate = isUserTemplate ? allTemplateFields.filter(f => CONTACT_VARS.has(f.key)) : [];
  const renderedMessage = rawContent ? renderPreview(rawContent, editValues, page?.name) : (broadcast.message ?? "");
  const isBusy = saving || sending || testSending;

  useEffect(() => {
    fetch(`/api/broadcasts/${initialBroadcast.id}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcast?: EnrichedBroadcast } | null) => {
        if (d?.broadcast) { setBroadcast(d.broadcast); setEditValues(prev => Object.keys(prev).length ? prev : (d.broadcast!.fieldValues ?? {})); }
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
      .catch(() => {}).finally(() => setTestContactsLoading(false));
  }, [testOpen, testSearch, broadcast.pageId]);

  const handleFieldChange = (key: string, val: string) => { setEditValues(prev => ({ ...prev, [key]: val })); setDirty(true); setSaveError(""); };

  const handleSaveCorrections = async () => {
    setSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/broadcasts/${broadcast.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fieldValues: editValues }) });
      const d = await res.json() as { broadcast?: BroadcastItem; error?: string };
      if (res.ok && d.broadcast) { setBroadcast(prev => ({ ...prev, ...d.broadcast, template: prev.template, messageTemplate: prev.messageTemplate })); setDirty(false); }
      else setSaveError(d.error ?? "Failed to save changes.");
    } catch { setSaveError("Network error saving changes."); }
    finally { setSaving(false); }
  };

  const toggleTestContact = (id: string) => setTestSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const handleTestSend = async () => {
    if (testSelected.size === 0) return;
    if (dirty) { setTestError("Save your field corrections first."); return; }
    setTestSending(true); setTestError(""); setTestResults(null);
    try {
      const res = await fetch(`/api/broadcasts/${broadcast.id}/test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactIds: [...testSelected] }) });
      const d = await res.json() as { results?: TestResult[]; error?: string };
      if (res.ok && d.results) setTestResults(d.results); else setTestError(d.error ?? "Test send failed.");
    } catch { setTestError("Network error during test send."); }
    finally { setTestSending(false); }
  };

  const handleSendAll = async () => {
    if (dirty) { setSendError("Save your field corrections before sending."); return; }
    setSending(true); setSendError("");
    try {
      const res = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: "POST" });
      const d = await res.json() as { queued?: boolean; message?: string; status?: string; sent?: number; failed?: number; ineligible?: number; broadcast?: BroadcastItem; error?: string };
      if (res.ok) {
        setSendResult({ sent: d.sent ?? 0, failed: d.failed ?? 0, ineligible: d.ineligible ?? 0, status: d.status ?? "sending", queued: d.queued, message: d.message });
        onSent({ ...broadcast, status: "sending" } as BroadcastItem);
      } else setSendError(d.error ?? "Failed to send message.");
    } catch { setSendError("Network error. Please try again."); }
    finally { setSending(false); }
  };

  const fieldErrors = templateFields.filter(f => f.required && !(editValues[f.key] ?? "").trim()).length;
  const fieldWarnings = templateFields.filter(f => !!validateFieldValue(f.type, editValues[f.key] ?? "")).length;
  const inp = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isBusy ? onClose : undefined} />
      <div className="relative w-full max-w-xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{broadcast.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>Draft · {recipientCount} recipients</p>
              {broadcast.templateName && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>{broadcast.templateName}</span>}
              {isUserTemplate && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>Personalized</span>}
            </div>
          </div>
          {!isBusy && <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>}
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto flex-1 min-h-0">
          {sendResult ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              {sendResult.queued ? (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(108,99,255,0.15)" }}>
                    <Send size={22} style={{ color: "#8B85FF" }} />
                  </div>
                  <div className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>Message queued for delivery</div>
                  <p className="text-[12.5px] text-center max-w-xs leading-relaxed" style={{ color: "#8B95A7" }}>
                    {sendResult.message ?? "The first batch of recipients will be processed within 60 seconds."}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: sendResult.failed === 0 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.12)" }}>
                    {sendResult.failed === 0 ? <Check size={24} style={{ color: "#10B981" }} /> : <Send size={22} style={{ color: "#F59E0B" }} />}
                  </div>
                  <div className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>
                    {sendResult.status === "completed" ? "Message sent" : sendResult.status === "sending" ? "Sending…" : "Delivery failed"}
                  </div>
                  <div className="flex gap-4 text-[13px]">
                    {sendResult.sent > 0 && <span style={{ color: "#10B981" }}>{sendResult.sent} delivered</span>}
                    {sendResult.ineligible > 0 && <span style={{ color: "#F59E0B" }}>{sendResult.ineligible} window closed</span>}
                    {(sendResult.failed - sendResult.ineligible) > 0 && <span style={{ color: "#EF4444" }}>{sendResult.failed - sendResult.ineligible} failed</span>}
                  </div>
                  {sendResult.ineligible > 0 && (
                    <p className="text-[12px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
                      {sendResult.ineligible} recipient{sendResult.ineligible !== 1 ? "s were" : " was"} skipped — their 24-hour Messenger window had closed. No credits were charged.
                    </p>
                  )}
                </>
              )}
              <button onClick={onClose} className="mt-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>Done</button>
            </div>
          ) : (
            <>
              {isUserTemplate && contactVarsInTemplate.length > 0 && (
                <section className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Check size={12} style={{ color: "#10B981" }} />
                    <span className="text-[11px] font-semibold" style={{ color: "#10B981" }}>Auto-personalized per recipient</span>
                    {loadingDetails && <Loader2 size={10} className="animate-spin" style={{ color: "#10B981" }} />}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contactVarsInTemplate.map(f => (
                      <span key={f.key} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>{`{{${f.key}}}`}</span>
                    ))}
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: "#8B95A7" }}>These are automatically replaced with each recipient&apos;s contact data when the message is sent.</p>
                </section>
              )}

              {templateFields.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Message Fields</span>
                    {(fieldWarnings > 0 || fieldErrors > 0) && (
                      <span className="text-[10.5px] flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                        <AlertCircle size={10} />
                        {fieldErrors > 0 ? `${fieldErrors} required missing` : `${fieldWarnings} warning${fieldWarnings > 1 ? "s" : ""}`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    {templateFields.map(f => {
                      const val = editValues[f.key] ?? "";
                      const typeWarn = validateFieldValue(f.type, val);
                      const missingRequired = f.required && !val.trim();
                      return (
                        <div key={f.key}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <label className="text-[12px] font-medium" style={{ color: "#F5F7FA" }}>{f.label}{f.required && <span style={{ color: "#EF4444" }}>*</span>}</label>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>{FIELD_TYPE_LABELS[f.type]}</span>
                            {(!!typeWarn || missingRequired) && <AlertCircle size={12} style={{ color: missingRequired ? "#EF4444" : "#F59E0B" }} />}
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
                      <button onClick={() => { setEditValues(broadcast.fieldValues ?? {}); setDirty(false); setSaveError(""); }} disabled={saving} className="text-[12px]" style={{ color: "#8B95A7" }}>Discard</button>
                      {saveError && <span className="text-[11.5px]" style={{ color: "#EF4444" }}>{saveError}</span>}
                    </div>
                  )}
                </section>
              )}

              <section>
                <span className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#8B95A7" }}>
                  {isUserTemplate ? "Preview (sample contact data)" : "Message Preview"}
                </span>
                <div className="p-3 rounded-xl text-[12.5px] whitespace-pre-wrap leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${dirty ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`, color: "#C8D0DC", fontFamily: "inherit" }}>
                  {renderedMessage}
                </div>
                {isUserTemplate && <p className="text-[11px] mt-1.5" style={{ color: "#8B95A7" }}>Each recipient receives a personalized version of this message.</p>}
              </section>

              <section>
                <button onClick={() => { setTestOpen(o => !o); setTestResults(null); setTestError(""); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left"
                  style={{ background: testOpen ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${testOpen ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.07)"}` }}>
                  <div className="flex items-center gap-2">
                    <Users size={13} style={{ color: "#8B85FF" }} />
                    <span className="text-[12.5px] font-medium" style={{ color: "#F5F7FA" }}>Test Send</span>
                    <span className="text-[11px]" style={{ color: "#8B95A7" }}>— send to 1–5 contacts before the full send</span>
                  </div>
                  {testOpen ? <ChevronDown size={13} style={{ color: "#8B95A7" }} /> : <ChevronRight size={13} style={{ color: "#8B95A7" }} />}
                </button>
                {testOpen && (
                  <div className="mt-2 p-4 rounded-xl flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>Sends to up to 5 contacts only. No database state changes — recipient statuses stay &quot;pending&quot;. No credits deducted.</p>
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
                      <input type="text" placeholder="Search contacts…" value={testSearch} onChange={e => setTestSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none" style={inp} />
                    </div>
                    {testContactsLoading ? (
                      <div className="flex items-center gap-2 text-[12px]" style={{ color: "#8B95A7" }}><Loader2 size={12} className="animate-spin" /> Loading contacts…</div>
                    ) : testContacts.length === 0 ? (
                      <p className="text-[12px]" style={{ color: "#8B95A7" }}>No contacts found.</p>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        {testContacts.slice(0, 20).map(c => {
                          const checked = testSelected.has(c.id);
                          const canAdd = testSelected.size < 5 || checked;
                          const ws = windowStatus(c);
                          const dotColor = ws === "open" ? "#10B981" : ws === "closed" ? "#F59E0B" : "#8B95A7";
                          return (
                            <button key={c.id} onClick={() => canAdd && toggleTestContact(c.id)} disabled={!canAdd}
                              className="flex items-center gap-2.5 p-2 rounded-lg text-left"
                              style={{ background: checked ? "rgba(108,99,255,0.08)" : "transparent", border: `1px solid ${checked ? "rgba(108,99,255,0.2)" : "transparent"}`, opacity: canAdd ? 1 : 0.4 }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: checked ? "#6C63FF" : "rgba(255,255,255,0.08)", border: checked ? "none" : "1px solid rgba(255,255,255,0.15)" }}>
                                {checked && <Check size={9} color="#fff" />}
                              </div>
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} title={ws === "open" ? "Window open" : ws === "closed" ? "Window closed (>24h)" : "Never messaged"} />
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
                    {testError && <div className="p-2.5 rounded-lg flex items-start gap-2 text-[12px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}><AlertCircle size={12} className="mt-0.5 shrink-0" /> {testError}</div>}
                    {testResults && (
                      <div className="flex flex-col gap-1.5">
                        {testResults.map(r => (
                          <div key={r.contactId} className="flex items-start gap-2 text-[12px]">
                            {r.success ? <Check size={13} style={{ color: "#10B981" }} className="mt-0.5 shrink-0" /> : <AlertCircle size={13} style={{ color: "#EF4444" }} className="mt-0.5 shrink-0" />}
                            <div><span style={{ color: "#F5F7FA" }}>{r.name}</span>{!r.success && r.error && <span className="ml-1.5 text-[11px]" style={{ color: "#EF4444" }}>{r.error}</span>}</div>
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
                <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                  <AlertCircle size={14} className="mt-0.5 shrink-0" /> {sendError}
                </div>
              )}
            </>
          )}
        </div>

        {!sendResult && (
          <div className="flex gap-3 px-6 py-4 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            {!isBusy && (
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>Cancel</button>
            )}
            <button onClick={handleSendAll} disabled={isBusy || dirty || fieldErrors > 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: "#6C63FF", opacity: (isBusy || dirty || fieldErrors > 0) ? 0.5 : 1 }}>
              {sending ? <><Loader2 size={14} className="animate-spin" /> Sending to {recipientCount}…</> : dirty ? "Save corrections first" : fieldErrors > 0 ? "Fix required fields first" : <><Send size={14} /> Send to {recipientCount} Recipients</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ComposeForm (replaces BroadcastWizard — single scrollable form, no steps) ──

function ComposeForm({ preSelectedTemplate, onClose, onCreated }: {
  preSelectedTemplate?: GlobalTemplate | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { pages } = useWorkspace();

  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const [audienceMode, setAudienceMode] = useState<"all" | "specific">("all");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [recipientsExpanded, setRecipientsExpanded] = useState(false);

  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplSearch, setTplSearch] = useState("");
  const [tplPickerOpen, setTplPickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(
    preSelectedTemplate ? { source: "global", data: preSelectedTemplate } : null
  );

  const [broadcastName, setBroadcastName] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [schedDate, setSchedDate] = useState("");

  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ status: string; queued?: boolean; message?: string } | null>(null);

  const selectedPage = pages.find(p => p.id === pageId);
  const isUserTpl = selectedTemplate?.source === "user";
  const templateAllFields = (selectedTemplate?.data.fields ?? []) as TemplateField[];
  const customFields = isUserTpl ? templateAllFields.filter(f => !CONTACT_VARS.has(f.key)) : templateAllFields;
  const contactVarsInTpl = isUserTpl ? templateAllFields.filter(f => CONTACT_VARS.has(f.key)) : [];
  const templateContent = selectedTemplate?.data.content ?? "";
  const previewMessage = templateContent ? renderPreview(templateContent, fieldValues, selectedPage?.name) : "";

  const fieldsValid = customFields.every(f => !f.required || !!(fieldValues[f.key] ?? "").trim());
  const isBusy = saving || sending;

  // Load contacts for specific mode
  useEffect(() => {
    if (!pageId || audienceMode !== "specific") return;
    setContactsLoading(true);
    const params = new URLSearchParams({ pageId, limit: "100" });
    if (contactSearch) params.set("search", contactSearch);
    fetch(`/api/contacts?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { contacts?: ContactItem[] } | null) => { if (d?.contacts) setContacts(d.contacts); })
      .catch(() => {}).finally(() => setContactsLoading(false));
  }, [pageId, contactSearch, audienceMode]);

  // Load templates for picker
  useEffect(() => {
    if (!tplPickerOpen) return;
    setTplLoading(true);
    const params = new URLSearchParams();
    if (tplSearch) params.set("search", tplSearch);
    fetch(`/api/broadcast-templates?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.templates) setGlobalTemplates(data.templates as GlobalTemplate[]); })
      .catch(() => {}).finally(() => setTplLoading(false));
  }, [tplPickerOpen, tplSearch]);

  // Run eligibility when page/audience changes
  useEffect(() => {
    if (!pageId) return;
    setEligibilityLoading(true);
    setEligibility(null);
    const body: Record<string, unknown> = { pageId };
    if (audienceMode === "specific") body.contactIds = [...selectedContacts];
    fetch("/api/broadcasts/eligibility-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(r => r.ok ? r.json() : null)
      .then((d: EligibilityResult | null) => { if (d) setEligibility(d); })
      .catch(() => {}).finally(() => setEligibilityLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, audienceMode, selectedContacts.size]);

  // Reset field values when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const initial: Record<string, string> = {};
      customFields.forEach(f => { initial[f.key] = ""; });
      setFieldValues(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.data.id]);

  const handleSelectTemplate = (t: GlobalTemplate) => {
    setSelectedTemplate({ source: "global", data: t });
    setTplPickerOpen(false);
  };

  const handleSubmit = async (mode: "send" | "schedule" | "draft") => {
    if (!selectedTemplate || !pageId) return;
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = { name: broadcastName.trim(), pageId, fieldValues };
      if (audienceMode === "all") body.allPageContacts = true;
      else body.contactIds = [...selectedContacts];
      if (selectedTemplate.source === "global") body.templateId = selectedTemplate.data.id;
      else body.messageTemplateId = selectedTemplate.data.id;
      if (mode === "schedule" && schedDate) body.scheduledAt = schedDate;

      const res = await fetch("/api/broadcasts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json() as { error?: string }; setError(d.error ?? "Failed to create message."); return; }
      const { broadcast } = await res.json() as { broadcast: { id: string } };

      if (mode === "draft") { setDone({ status: "draft" }); onCreated(); return; }
      if (mode === "schedule") { setDone({ status: "scheduled" }); onCreated(); return; }

      setSaving(false); setSending(true);
      const sendRes = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: "POST" });
      const sendData = await sendRes.json() as { queued?: boolean; message?: string; status?: string; error?: string };
      if (!sendRes.ok) { setError(sendData.error ?? "Message saved but send failed."); onCreated(); return; }
      setDone({ status: sendData.status ?? "sending", queued: sendData.queued, message: sendData.message });
      onCreated();
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); setSending(false); }
  };

  const inp = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };
  const sectionLabel = "text-[10.5px] font-semibold uppercase tracking-widest mb-3 block";

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl flex flex-col items-center py-12 px-8 gap-5" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: done.queued ? "rgba(108,99,255,0.15)" : done.status === "draft" ? "rgba(139,149,167,0.1)" : "rgba(16,185,129,0.12)" }}>
            {done.queued ? <Send size={22} style={{ color: "#8B85FF" }} /> : done.status === "draft" ? <FileText size={22} style={{ color: "#8B95A7" }} /> : <Calendar size={22} style={{ color: "#10B981" }} />}
          </div>
          <div className="text-[16px] font-semibold text-center" style={{ color: "#F5F7FA" }}>
            {done.queued ? "Message queued for delivery" : done.status === "draft" ? "Saved as draft" : "Scheduled"}
          </div>
          {done.queued && <p className="text-[12.5px] text-center max-w-xs leading-relaxed" style={{ color: "#8B95A7" }}>{done.message ?? "Recipients will begin receiving the message shortly. Track progress in Send History."}</p>}
          {done.status === "draft" && <p className="text-[12.5px] text-center" style={{ color: "#8B95A7" }}>Open it from Utility Messages to review and send when ready.</p>}
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isBusy ? onClose : undefined} />
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Compose Utility Message</h2>
            <p className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>Send a compliant notification to customers within their active Messenger window</p>
          </div>
          {!isBusy && <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 min-h-0 px-6 py-5 flex flex-col gap-6">

          {/* Message Name */}
          <div>
            <label className={sectionLabel} style={{ color: "#8B95A7" }}>Message Name</label>
            <input value={broadcastName} onChange={e => setBroadcastName(e.target.value)}
              placeholder="e.g. September Appointment Reminders"
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={inp} />
          </div>

          {/* Delivery Channel */}
          {pages.length > 1 && (
            <div>
              <span className={sectionLabel} style={{ color: "#8B95A7" }}>Delivery Channel</span>
              <div className="flex flex-col gap-2">
                {pages.map(p => (
                  <button key={p.id} onClick={() => setPageId(p.id)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{ background: pageId === p.id ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${pageId === p.id ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: p.color }}>{p.avatar}</div>
                    <span className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{p.name}</span>
                    {pageId === p.id && <Check size={13} className="ml-auto" style={{ color: "#6C63FF" }} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recipients */}
          <div>
            <span className={sectionLabel} style={{ color: "#8B95A7" }}>Recipients</span>
            <div className="flex flex-col gap-2">
              {(["all", "specific"] as const).map(mode => (
                <button key={mode} onClick={() => { setAudienceMode(mode); setSelectedContacts(new Set()); if (mode === "specific") setRecipientsExpanded(true); }}
                  className="flex items-center gap-3 p-3.5 rounded-xl text-left"
                  style={{ background: audienceMode === mode ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${audienceMode === mode ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}` }}>
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: audienceMode === mode ? "#6C63FF" : "rgba(255,255,255,0.2)" }}>
                    {audienceMode === mode && <div className="w-2 h-2 rounded-full" style={{ background: "#6C63FF" }} />}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>
                      {mode === "all" ? "All page contacts" : "Specific contacts"}
                    </div>
                    <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>
                      {mode === "all" ? "Every contact on this page — eligibility checked automatically" : "Manually choose which contacts to include"}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {audienceMode === "specific" && (
              <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                <button onClick={() => setRecipientsExpanded(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-2.5"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="text-[12px]" style={{ color: "#8B95A7" }}>
                    {selectedContacts.size > 0 ? `${selectedContacts.size} contact${selectedContacts.size !== 1 ? "s" : ""} selected` : "Select contacts…"}
                  </span>
                  {recipientsExpanded ? <ChevronDown size={13} style={{ color: "#8B95A7" }} /> : <ChevronRight size={13} style={{ color: "#8B95A7" }} />}
                </button>
                {recipientsExpanded && (
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    <div className="relative mt-2">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
                      <input type="text" placeholder="Search contacts…" value={contactSearch}
                        onChange={e => setContactSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none" style={inp} />
                    </div>
                    {contactsLoading ? (
                      <div className="flex items-center gap-2 text-[12px] py-3" style={{ color: "#8B95A7" }}><Loader2 size={12} className="animate-spin" /> Loading…</div>
                    ) : contacts.length === 0 ? (
                      <p className="text-[12px] py-2" style={{ color: "#8B95A7" }}>{contactSearch ? "No contacts match." : "No contacts found. Scan the page first."}</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]" style={{ color: "#8B95A7" }}>{contacts.length} contacts</span>
                          <button onClick={() => setSelectedContacts(prev => prev.size === contacts.length ? new Set() : new Set(contacts.map(c => c.id)))}
                            className="text-[11px]" style={{ color: "#6C63FF" }}>
                            {selectedContacts.size === contacts.length ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {contacts.map(c => {
                            const checked = selectedContacts.has(c.id);
                            const ws = windowStatus(c);
                            const dotColor = ws === "open" ? "#10B981" : ws === "closed" ? "#F59E0B" : "#8B95A7";
                            return (
                              <button key={c.id} onClick={() => setSelectedContacts(prev => { const next = new Set(prev); next.has(c.id) ? next.delete(c.id) : next.add(c.id); return next; })}
                                className="flex items-center gap-2.5 p-2 rounded-lg text-left"
                                style={{ background: checked ? "rgba(108,99,255,0.08)" : "transparent", border: `1px solid ${checked ? "rgba(108,99,255,0.2)" : "transparent"}` }}>
                                <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                                  style={{ background: checked ? "#6C63FF" : "rgba(255,255,255,0.06)", border: checked ? "none" : "1px solid rgba(255,255,255,0.12)" }}>
                                  {checked && <Check size={9} color="#fff" />}
                                </div>
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} title={ws === "open" ? "Window open" : ws === "closed" ? "Window closed" : "Never messaged"} />
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>
                                  {contactDisplayName(c).charAt(0).toUpperCase()}
                                </div>
                                <span className="text-[12px]" style={{ color: "#F5F7FA" }}>{contactDisplayName(c)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Eligibility summary */}
            {pageId && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                {eligibilityLoading ? (
                  <><Loader2 size={11} className="animate-spin" style={{ color: "#8B95A7" }} /><span style={{ color: "#8B95A7" }}>Checking eligibility…</span></>
                ) : eligibility ? (
                  <>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: eligibility.eligible > 0 ? "#10B981" : "#F59E0B" }} />
                    <span style={{ color: eligibility.eligible > 0 ? "#10B981" : "#F59E0B" }}>
                      {eligibility.eligible.toLocaleString()} eligible recipient{eligibility.eligible !== 1 ? "s" : ""}
                    </span>
                    {(eligibility.ineligible > 0 || eligibility.skipped > 0) && (
                      <span style={{ color: "#8B95A7" }}>
                        {eligibility.ineligible > 0 && ` · ${eligibility.ineligible} window closed`}
                        {eligibility.skipped > 0 && ` · ${eligibility.skipped} unsubscribed`}
                      </span>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <span className={sectionLabel} style={{ color: "#8B95A7" }}>Notification Template</span>
            {selectedTemplate ? (
              <div className="p-3.5 rounded-xl flex items-start gap-3" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.2)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(108,99,255,0.15)" }}>
                  <FileText size={14} style={{ color: "#8B85FF" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{selectedTemplate.data.name}</span>
                    {selectedTemplate.data.category && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>{selectedTemplate.data.category}</span>}
                  </div>
                  {selectedTemplate.data.description && <p className="text-[12px] mt-0.5" style={{ color: "#8B95A7" }}>{selectedTemplate.data.description}</p>}
                </div>
                <button onClick={() => { setSelectedTemplate(null); setFieldValues({}); }} title="Change template">
                  <X size={13} style={{ color: "#8B95A7" }} />
                </button>
              </div>
            ) : (
              <button onClick={() => setTplPickerOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <FileText size={14} style={{ color: "#8B95A7" }} />
                <span className="text-[13px]" style={{ color: "#8B95A7" }}>Select a notification template…</span>
                <ChevronRight size={13} className="ml-auto" style={{ color: "#8B95A7" }} />
              </button>
            )}

            {tplPickerOpen && !selectedTemplate && (
              <div className="mt-2 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
                    <input type="text" placeholder="Search templates…" value={tplSearch}
                      onChange={e => setTplSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none" style={inp} />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto p-2">
                  {tplLoading ? (
                    <div className="flex items-center gap-2 px-2 py-3 text-[12px]" style={{ color: "#8B95A7" }}><Loader2 size={12} className="animate-spin" /> Loading templates…</div>
                  ) : globalTemplates.length === 0 ? (
                    <p className="text-[12px] px-2 py-3" style={{ color: "#8B95A7" }}>
                      {tplSearch ? "No templates match your search." : "No active templates available. Contact your administrator."}
                    </p>
                  ) : globalTemplates.map(t => (
                    <button key={t.id} onClick={() => handleSelectTemplate(t)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg mb-1 text-left"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,99,255,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(108,99,255,0.1)" }}>
                        <FileText size={12} style={{ color: "#8B85FF" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</span>
                          {t.category && <span className="text-[9.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7" }}>{t.category}</span>}
                        </div>
                        {t.description && <p className="text-[11.5px] mt-0.5 truncate" style={{ color: "#8B95A7" }}>{t.description}</p>}
                        {t.fields && t.fields.length > 0 && <p className="text-[11px] mt-0.5" style={{ color: "#6C63FF" }}>{t.fields.length} field{t.fields.length !== 1 ? "s" : ""} to fill</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Message Content: fields + preview */}
          {selectedTemplate && (
            <div>
              <span className={sectionLabel} style={{ color: "#8B95A7" }}>Message Content</span>

              {isUserTpl && contactVarsInTpl.length > 0 && (
                <div className="mb-4 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Check size={12} style={{ color: "#10B981" }} />
                    <span className="text-[11px] font-semibold" style={{ color: "#10B981" }}>Auto-personalized per recipient</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contactVarsInTpl.map(f => (
                      <span key={f.key} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>{`{{${f.key}}}`}</span>
                    ))}
                  </div>
                </div>
              )}

              {customFields.length > 0 ? (
                <div className="flex flex-col gap-3 mb-4">
                  {customFields.map(f => {
                    const val = fieldValues[f.key] ?? "";
                    const typeWarn = validateFieldValue(f.type, val);
                    const missingRequired = f.required && !val.trim();
                    return (
                      <div key={f.key}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <label className="text-[12px] font-medium" style={{ color: "#F5F7FA" }}>{f.label}{f.required && <span style={{ color: "#EF4444" }}>*</span>}</label>
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>{FIELD_TYPE_LABELS[f.type]}</span>
                        </div>
                        <FieldInput field={f} value={val} onChange={v => setFieldValues(prev => ({ ...prev, [f.key]: v }))} />
                        {typeWarn && !missingRequired && <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: "#F59E0B" }}><AlertCircle size={10} /> {typeWarn}</p>}
                        {missingRequired && val && <p className="text-[11px] mt-1" style={{ color: "#EF4444" }}>This field is required</p>}
                      </div>
                    );
                  })}
                </div>
              ) : !isUserTpl ? (
                <div className="mb-4 p-3 rounded-xl text-[12.5px]" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#10B981" }}>
                  This template has no editable fields — the message is fully fixed.
                </div>
              ) : null}

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#8B95A7" }}>
                  {isUserTpl ? "Preview (sample contact data)" : "Message Preview"}
                </span>
                <div className="p-3.5 rounded-xl text-[13px] whitespace-pre-wrap leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", color: "#C8D0DC", fontFamily: "inherit" }}>
                  {previewMessage || <span style={{ color: "#8B95A7" }}>(fill in the fields above to see a preview)</span>}
                </div>
                {isUserTpl && <p className="text-[11px] mt-1.5" style={{ color: "#8B95A7" }}>Each recipient receives a personalized version using their contact data.</p>}
              </div>
            </div>
          )}

          {/* Delivery */}
          {selectedTemplate && (
            <div>
              <span className={sectionLabel} style={{ color: "#8B95A7" }}>Delivery</span>
              <div className="flex flex-col gap-2">
                {(["now", "later"] as const).map(s => (
                  <button key={s} onClick={() => setSchedule(s)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{ background: schedule === s ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${schedule === s ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}` }}>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: schedule === s ? "#6C63FF" : "rgba(255,255,255,0.2)" }}>
                      {schedule === s && <div className="w-2 h-2 rounded-full" style={{ background: "#6C63FF" }} />}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>
                        {s === "now" ? "Send immediately" : "Schedule for later"}
                      </div>
                      <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>
                        {s === "now" ? "Delivery begins within 60 seconds" : "Choose a date and time to send"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {schedule === "later" && (
                <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none mt-2" style={inp} />
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t px-6 py-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex gap-3">
            {!isBusy && (
              <>
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>Cancel</button>
                <button onClick={() => handleSubmit("draft")} disabled={!broadcastName.trim() || !selectedTemplate || !pageId}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: !broadcastName.trim() || !selectedTemplate ? "#8B95A7" : "#F5F7FA", opacity: (!broadcastName.trim() || !selectedTemplate) ? 0.5 : 1 }}>
                  <FileText size={13} /> Save Draft
                </button>
              </>
            )}
            <button
              onClick={() => handleSubmit(schedule === "now" ? "send" : "schedule")}
              disabled={isBusy || !broadcastName.trim() || !selectedTemplate || !pageId || !fieldsValid || (audienceMode === "specific" && selectedContacts.size === 0) || (schedule === "later" && !schedDate) || (eligibility?.eligible === 0)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{
                background: "#6C63FF",
                opacity: (isBusy || !broadcastName.trim() || !selectedTemplate || !pageId || !fieldsValid || (audienceMode === "specific" && selectedContacts.size === 0) || (eligibility?.eligible === 0)) ? 0.4 : 1,
              }}>
              {sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                : saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : eligibility?.eligible === 0 && eligibility ? "No eligible recipients"
                : schedule === "now"
                  ? <><Send size={14} /> {eligibility ? `Send to ${eligibility.eligible.toLocaleString()} Recipients` : "Send Message"}</>
                  : <><Calendar size={14} /> Schedule Message</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Template Library Section ───────────────────────────────────────────────────

function TemplateLibrarySection({ onUseTemplate }: { onUseTemplate: (t: GlobalTemplate) => void }) {
  const [templates, setTemplates] = useState<GlobalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/broadcast-templates?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.templates) setTemplates(data.templates as GlobalTemplate[]); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [search]);

  const categories = ["all", ...Array.from(new Set(templates.map(t => t.category).filter(Boolean))) as string[]];
  const filtered = selectedCategory === "all" ? templates : templates.filter(t => t.category === selectedCategory);

  const inp = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
          <input type="text" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] outline-none" style={inp} />
        </div>
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize"
                style={{
                  background: selectedCategory === cat ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selectedCategory === cat ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}`,
                  color: selectedCategory === cat ? "#8B85FF" : "#8B95A7",
                }}>
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-36 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <BookOpen size={36} style={{ color: "#8B95A7", opacity: 0.25 }} />
          <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No templates found</div>
          <p className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
            {search ? "Try a different search term." : "No active templates are available. Contact your administrator to create templates."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="flex flex-col rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="p-4 flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(108,99,255,0.12)" }}>
                    <FileText size={15} style={{ color: "#8B85FF" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</div>
                    {t.category && <span className="text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>{t.category}</span>}
                  </div>
                </div>
                {t.description && <p className="text-[12px] leading-relaxed mb-3" style={{ color: "#8B95A7" }}>{t.description}</p>}
                <div className="text-[11.5px] p-2.5 rounded-lg whitespace-pre-wrap line-clamp-3"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "#8B95A7", fontFamily: "inherit" }}>
                  {t.content.slice(0, 120)}{t.content.length > 120 ? "…" : ""}
                </div>
                {t.fields && t.fields.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(t.fields as TemplateField[]).slice(0, 3).map(f => (
                      <span key={f.key} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(108,99,255,0.08)", color: "#8B85FF" }}>{`{{${f.key}}}`}</span>
                    ))}
                    {t.fields.length > 3 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7" }}>+{t.fields.length - 3} more</span>}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button onClick={() => onUseTemplate(t)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12.5px] font-semibold"
                  style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)", color: "#8B85FF" }}>
                  <Send size={12} /> Use This Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Utility Messages Section (drafts + scheduled) ──────────────────────────────

function UtilityMessagesSection({ onDraftClick, onCompose }: { onDraftClick: (b: BroadcastItem) => void; onCompose: () => void }) {
  const { pages } = useWorkspace();
  const [items, setItems] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    fetch("/api/broadcasts?limit=50&status=draft")
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcasts?: BroadcastItem[] } | null) => {
        const drafts = d?.broadcasts ?? [];
        fetch("/api/broadcasts?limit=50&status=scheduled")
          .then(r2 => r2.ok ? r2.json() : null)
          .then((d2: { broadcasts?: BroadcastItem[] } | null) => {
            setItems([...drafts, ...(d2?.broadcasts ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          })
          .catch(() => {}).finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
    </div>
  );

  if (items.length === 0) return (
    <div className="py-20 flex flex-col items-center gap-4">
      <MessageSquare size={36} style={{ color: "#8B95A7", opacity: 0.25 }} />
      <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No pending utility messages</div>
      <p className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
        Messages you compose and save as drafts appear here, ready to review and send.
      </p>
      <button onClick={onCompose} className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>
        <Plus size={14} /> Compose Message
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {items.map(b => {
        const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.draft;
        const recipientCount = b.totalRecipients ?? b._count?.recipients ?? 0;
        return (
          <button key={b.id} onClick={() => onDraftClick(b)}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-left"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,99,255,0.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(108,99,255,0.1)" }}>
              <MessageSquare size={16} style={{ color: "#8B85FF" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{b.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: sc.bg, color: sc.color }}>
                  {STATUS_LABELS[b.status] ?? b.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11.5px]" style={{ color: "#8B95A7" }}>
                <span>{pages.find(p => p.id === b.pageId)?.name ?? "—"}</span>
                {b.templateName && <><span>·</span><span>{b.templateName}</span></>}
                {recipientCount > 0 && <><span>·</span><span>{recipientCount.toLocaleString()} recipients</span></>}
                {b.scheduledAt && <><span>·</span><span>Scheduled {fmtDate(b.scheduledAt)}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px]" style={{ color: "#8B95A7" }}>Created {fmtDate(b.createdAt)}</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>
                <Send size={11} /> Review & Send
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Send History Section ───────────────────────────────────────────────────────

function SendHistorySection() {
  const { pages } = useWorkspace();
  const router = useRouter();
  const [items, setItems] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sending" | "completed" | "failed">("all");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (filter !== "all") params.set("status", filter);
    else {
      // Exclude drafts and scheduled from history
    }
    fetch(`/api/broadcasts?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcasts?: BroadcastItem[] } | null) => {
        // Filter out draft and scheduled — they live in Utility Messages
        const filtered = (d?.broadcasts ?? []).filter(b => b.status !== "draft" && b.status !== "scheduled");
        setItems(filtered);
      })
      .catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  const FILTERS = [
    { key: "all" as const, label: "All" },
    { key: "sending" as const, label: "In Progress" },
    { key: "completed" as const, label: "Delivered" },
    { key: "failed" as const, label: "Failed" },
  ];

  if (loading) return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-1 mb-5">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium"
            style={{
              background: filter === f.key ? "rgba(108,99,255,0.12)" : "transparent",
              color: filter === f.key ? "#8B85FF" : "#8B95A7",
              border: `1px solid ${filter === f.key ? "rgba(108,99,255,0.25)" : "transparent"}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <Clock size={36} style={{ color: "#8B95A7", opacity: 0.25 }} />
          <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No send history yet</div>
          <p className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
            Sent messages and their delivery results will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Message", "Channel", "Template", "Status", "Recipients", "Delivered", "Skipped", "Date", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "#8B95A7" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((b, i) => {
                  const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.draft;
                  return (
                    <tr key={b.id} onClick={() => router.push(`/app/broadcasts/${b.id}`)}
                      className="cursor-pointer"
                      style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,99,255,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")}>
                      <td className="px-4 py-3" style={{ color: "#F5F7FA" }}>
                        <div className="font-medium whitespace-nowrap flex items-center gap-2">
                          {b.name}
                          {b.messageTemplateId && <span className="text-[9.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>P</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#8B95A7" }}>{pages.find(p => p.id === b.pageId)?.name ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#8B95A7" }}>{b.templateName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap" style={{ background: sc.bg, color: sc.color }}>
                          {STATUS_LABELS[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "#8B95A7" }}>
                        {(b.totalRecipients ?? b._count?.recipients ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: b.status === "completed" ? "#10B981" : "#8B95A7" }}>
                        {b.status === "completed" ? (b.sent ?? 0).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "#8B95A7" }}>
                        {b.status === "completed" && ((b.ineligibleCount ?? 0) + (b.skippedCount ?? 0)) > 0
                          ? ((b.ineligibleCount ?? 0) + (b.skippedCount ?? 0)).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#8B95A7" }}>{fmtDate(b.createdAt)}</td>
                      <td className="px-4 py-3"><ExternalLink size={13} style={{ color: "#8B95A7", opacity: 0.4 }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard Section ──────────────────────────────────────────────────────────

interface DashboardStats {
  templates: { total: number; available: number; draft: number; pendingReview: number; rejected: number; disabled: number };
  campaigns: { total: number; totalSent: number; totalDelivered: number; totalFailed: number; totalSkipped: number; creditsUsed: number };
  recentBroadcasts: Array<{
    id: string; name: string; status: string; templateName: string | null;
    totalRecipients: number; sent: number; failed: number; ineligibleCount: number;
    createdAt: string; completedAt: string | null; startedAt: string | null; scheduledAt: string | null;
    pageId: string | null;
  }>;
  recentTemplates: Array<{ id: string; name: string; status: string; updatedAt: string; createdAt: string }>;
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: "Draft",          color: "#8B95A7", bg: "rgba(139,149,167,0.1)" },
  scheduled:      { label: "Scheduled",      color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  sending:        { label: "Sending",        color: "#8B85FF", bg: "rgba(108,99,255,0.1)"  },
  completed:      { label: "Delivered",      color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  failed:         { label: "Failed",         color: "#EF4444", bg: "rgba(239,68,68,0.1)"   },
  cancelled:      { label: "Cancelled",      color: "#8B95A7", bg: "rgba(139,149,167,0.1)" },
  pending_review: { label: "Pending Review", color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  approved:       { label: "Approved",       color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  rejected:       { label: "Rejected",       color: "#EF4444", bg: "rgba(239,68,68,0.1)"   },
  disabled:       { label: "Disabled",       color: "#8B95A7", bg: "rgba(139,149,167,0.08)"},
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.draft;
  return (
    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

function StatCard({ label, value, sub, accent, icon: Icon, onClick }: {
  label: string; value: number | string; sub?: string;
  accent: string; icon: React.ComponentType<{ size?: number }>;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className="flex flex-col p-5 rounded-2xl text-left w-full"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", cursor: onClick ? "pointer" : "default" }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-[26px] font-bold tabular-nums leading-none mb-1.5" style={{ color: "#F5F7FA" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-[12px] font-medium" style={{ color: "#8B95A7" }}>{label}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: "rgba(139,149,167,0.6)" }}>{sub}</div>}
    </button>
  );
}

function ActivityItem({ icon: Icon, color, title, sub, time }: {
  icon: React.ComponentType<{ size?: number }>; color: string;
  title: React.ReactNode; sub?: string; time: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}18`, color }}>
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium leading-snug" style={{ color: "#F5F7FA" }}>{title}</div>
        {sub && <div className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>{sub}</div>}
      </div>
      <div className="text-[11px] shrink-0" style={{ color: "rgba(139,149,167,0.6)" }}>{time}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
}

function DashboardSection({ onCompose, onViewHistory, onViewMessages }: {
  onCompose: () => void;
  onViewHistory: () => void;
  onViewMessages: () => void;
}) {
  const { pages } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/broadcasts/stats")
      .then(r => r.ok ? r.json() : null)
      .then((d: DashboardStats | null) => { if (d) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Activity feed: recent campaign events only (template status changes are admin-internal)
  const activity: Array<{ key: string; date: string; item: DashboardStats["recentBroadcasts"][0] }> = [];
  if (stats) {
    stats.recentBroadcasts.forEach(b => activity.push({ key: `b-${b.id}`, date: b.completedAt ?? b.startedAt ?? b.scheduledAt ?? b.createdAt, item: b }));
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const deliveryRate = stats && stats.campaigns.totalSent > 0
    ? Math.round((stats.campaigns.totalDelivered / stats.campaigns.totalSent) * 100)
    : null;

  return (
    <div className="flex flex-col gap-7">

      {/* Primary actions */}
      <div className="flex items-center gap-3">
        <button onClick={onCompose}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF" }}>
          <Send size={14} /> Send Message
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Template stats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8B95A7" }}>Templates</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Templates"       value={stats.templates.total}             accent="#8B85FF" icon={FileText} />
              <StatCard label="Available for Sending" value={stats.templates.available}         accent="#10B981" icon={Check}    sub="Available in Send workflow" />
              <StatCard label="Pending Review"        value={stats.templates.pendingReview}     accent="#F59E0B" icon={Clock}    sub={stats.templates.pendingReview > 0 ? "Awaiting admin review" : undefined} />
              <StatCard label="Total Campaigns"       value={stats.campaigns.total}             accent="#8B85FF" icon={Radio} />
            </div>
          </div>

          {/* Campaign stats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8B95A7" }}>Message Campaigns</h2>
              <button onClick={onViewHistory} className="text-[11.5px] flex items-center gap-1" style={{ color: "#8B85FF" }}>
                View history <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Messages Sent"    value={stats.campaigns.totalSent}      accent="#8B85FF" icon={Send}  sub="Total recipients targeted" />
              <StatCard label="Delivered"        value={stats.campaigns.totalDelivered} accent="#10B981" icon={Check} sub={deliveryRate !== null ? `${deliveryRate}% delivery rate` : undefined} />
              <StatCard label="Failed / Skipped" value={stats.campaigns.totalFailed + stats.campaigns.totalSkipped} accent="#EF4444" icon={AlertCircle} sub={stats.campaigns.totalSkipped > 0 ? `${stats.campaigns.totalSkipped.toLocaleString()} window-closed` : undefined} />
            </div>
          </div>

          {/* Two-column: activity + campaigns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Recent Activity */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>Recent Activity</h3>
              </div>
              <div className="px-5 divide-y divide-white/[0.04]">
                {activity.length === 0 ? (
                  <p className="text-[12.5px] py-8 text-center" style={{ color: "#8B95A7" }}>No activity yet.</p>
                ) : activity.slice(0, 8).map(a => {
                  const b = a.item;
                  const s = STATUS_BADGE[b.status] ?? STATUS_BADGE.draft;
                  const delivered = b.status === "completed" ? b.sent : null;
                  return (
                    <ActivityItem key={a.key}
                      icon={Send} color={s.color}
                      title={<span>Campaign <span style={{ color: "#F5F7FA" }}>&ldquo;{b.name}&rdquo;</span> — <span style={{ color: s.color }}>{s.label}</span></span>}
                      sub={delivered !== null ? `${delivered.toLocaleString()} delivered of ${b.totalRecipients.toLocaleString()} targeted` : b.templateName ?? undefined}
                      time={timeAgo(a.date)} />
                  );
                })}
              </div>
            </div>

            {/* Recent Campaign History */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>Recent Campaigns</h3>
                <button onClick={onViewHistory} className="text-[11.5px] flex items-center gap-1" style={{ color: "#8B85FF" }}>
                  Full history <ChevronRight size={12} />
                </button>
              </div>

              {stats.recentBroadcasts.length === 0 ? (
                <div className="px-5 py-12 flex flex-col items-center gap-3">
                  <div style={{ color: "#8B95A7", opacity: 0.2 }}><Radio size={28} /></div>
                  <p className="text-[12.5px] text-center" style={{ color: "#8B95A7" }}>No campaigns yet. Send your first message to get started.</p>
                  <button onClick={onCompose} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF" }}>
                    <Send size={12} /> Send Message
                  </button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {stats.recentBroadcasts.map((b, i) => {
                    const s = STATUS_BADGE[b.status] ?? STATUS_BADGE.draft;
                    const page = pages.find(p => p.id === b.pageId);
                    const deliveredPct = b.totalRecipients > 0 && b.status === "completed"
                      ? Math.round((b.sent / b.totalRecipients) * 100) : null;
                    return (
                      <div key={b.id} className="px-5 py-3.5 flex flex-col gap-1.5"
                        style={{ borderBottom: i < stats.recentBroadcasts.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[12.5px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{b.name}</span>
                          <StatusPill status={b.status} />
                        </div>
                        <div className="flex items-center gap-3 text-[11.5px]" style={{ color: "#8B95A7" }}>
                          {page && <span>{page.name}</span>}
                          {b.templateName && <><span>·</span><span>{b.templateName}</span></>}
                          <span className="ml-auto">{fmtDate(b.createdAt)}</span>
                        </div>
                        {b.status === "completed" && (
                          <div className="flex items-center gap-4 text-[11.5px]">
                            <span style={{ color: "#10B981" }}>{b.sent.toLocaleString()} delivered</span>
                            {b.ineligibleCount > 0 && <span style={{ color: "#F59E0B" }}>{b.ineligibleCount.toLocaleString()} skipped</span>}
                            {b.failed - b.ineligibleCount > 0 && <span style={{ color: "#EF4444" }}>{(b.failed - b.ineligibleCount).toLocaleString()} failed</span>}
                            {deliveredPct !== null && (
                              <span className="ml-auto text-[10.5px] font-semibold" style={{ color: "#10B981" }}>{deliveredPct}%</span>
                            )}
                          </div>
                        )}
                        {b.status === "completed" && b.totalRecipients > 0 && (
                          <div className="h-1 rounded-full overflow-hidden mt-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.round((b.sent / b.totalRecipients) * 100)}%`, background: "#10B981" }} />
                          </div>
                        )}
                        {b.status === "sending" && (
                          <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "#8B85FF" }}>
                            <Loader2 size={11} className="animate-spin" /> Sending to {b.totalRecipients.toLocaleString()} recipients…
                          </div>
                        )}
                        {b.status === "scheduled" && b.scheduledAt && (
                          <div className="text-[11.5px]" style={{ color: "#F59E0B" }}>Scheduled for {fmtDate(b.scheduledAt)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* No page connected notice */}
          {pages.length === 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl text-[12.5px]"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", color: "#F59E0B" }}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>No Facebook Page connected. Connect a Page in Settings to send utility messages.</span>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center text-[13px]" style={{ color: "#8B95A7" }}>Failed to load dashboard stats.</div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Section = "overview" | "messages" | "history";

export default function UtilityMessageCenter() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [showCompose, setShowCompose] = useState(false);
  const [preSelectedTemplate, setPreSelectedTemplate] = useState<GlobalTemplate | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<BroadcastItem | null>(null);

  const handleUseTemplate = (t: GlobalTemplate) => {
    setPreSelectedTemplate(t);
    setShowCompose(true);
  };

  const handleComposeClose = () => {
    setShowCompose(false);
    setPreSelectedTemplate(null);
  };

  const handleComposeCreated = () => {
    setShowCompose(false);
    setPreSelectedTemplate(null);
    setActiveSection("messages");
  };

  const NAV: Array<{ key: Section; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { key: "overview",  label: "Dashboard",        icon: LayoutDashboard },
    { key: "messages",  label: "Utility Messages", icon: MessageSquare },
    { key: "history",   label: "Send History",     icon: Clock },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Utility Message Center</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>
            Send compliant utility notifications to customers within their active Messenger window.
          </p>
        </div>
        <button onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF" }}>
          <Plus size={14} /> Compose Message
        </button>
      </div>

      {/* Section Navigation */}
      <div className="flex items-center gap-0 mb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {NAV.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveSection(key)}
            className="flex items-center gap-2 px-5 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: activeSection === key ? "#6C63FF" : "transparent",
              color: activeSection === key ? "#8B85FF" : "#8B95A7",
            }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      {activeSection === "overview" && (
        <DashboardSection
          onCompose={() => setShowCompose(true)}
          onViewHistory={() => setActiveSection("history")}
          onViewMessages={() => setActiveSection("messages")}
        />
      )}
      {activeSection === "messages" && (
        <UtilityMessagesSection
          onDraftClick={b => setSelectedDraft(b)}
          onCompose={() => setShowCompose(true)}
        />
      )}
      {activeSection === "history" && (
        <SendHistorySection />
      )}

      {/* Send Workflow */}
      {showCompose && (
        <SendWorkflow
          preSelectedTemplate={preSelectedTemplate}
          onClose={handleComposeClose}
          onCreated={handleComposeCreated}
        />
      )}

      {/* Draft Send Modal */}
      {selectedDraft && (
        <DraftDetailModal
          broadcast={selectedDraft}
          onClose={() => setSelectedDraft(null)}
          onSent={() => setSelectedDraft(null)}
        />
      )}
    </div>
  );
}
