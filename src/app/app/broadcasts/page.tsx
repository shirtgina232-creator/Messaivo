"use client";

import { useState, useEffect } from "react";
import { Plus, Radio, X, Check, AlertCircle, Search, Circle, FileText, Users, Send, Loader2 } from "lucide-react";
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

interface ContactItem {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  metaUserId: string;
  pageId: string;
}

type BroadcastItem = {
  id: string;
  name: string;
  status: string;
  pageId: string | null;
  templateId: string | null;
  templateName: string | null;
  message: string | null;
  fieldValues: Record<string, string> | null;
  scheduledAt: string | null;
  createdAt: string;
  sent?: number;
  failed?: number;
  totalRecipients?: number;
  _count?: { recipients: number };
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
  scheduled: { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
  sending:   { bg: "rgba(108,99,255,0.1)",  color: "#8B85FF" },
  completed: { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
  failed:    { bg: "rgba(239,68,68,0.1)",   color: "#EF4444" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderTemplate(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
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
    return (
      <textarea rows={3} className={`${base} resize-none`} style={style}
        placeholder={field.placeholder ?? ""} maxLength={field.maxLength}
        value={value} onChange={e => onChange(e.target.value)} />
    );
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
  return (
    <input type={inputType} className={base} style={style}
      placeholder={field.placeholder ?? (field.type === "CURRENCY" ? "0.00" : field.type === "URL" ? "https://" : "")}
      maxLength={field.maxLength} value={value} onChange={e => onChange(e.target.value)} />
  );
}

// ── Field type validation helpers ─────────────────────────────────────────────

function validateFieldValue(type: FieldType, value: string): string | null {
  if (!value.trim()) return null; // empty handled separately by required check
  if (type === "URL") {
    try { new URL(value); return null; } catch { return `Expected a URL starting with https://`; }
  }
  if (type === "DATE") {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "Expected a date (e.g. 2026-12-31)";
    return null;
  }
  if (type === "NUMBER" || type === "CURRENCY") {
    if (isNaN(Number(value))) return "Expected a number";
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

  // Full broadcast with template fields, fetched on mount
  const [broadcast, setBroadcast] = useState<EnrichedBroadcast>(initialBroadcast);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Editable field values (initialised from saved broadcast.fieldValues)
  const [editValues, setEditValues] = useState<Record<string, string>>(initialBroadcast.fieldValues ?? {});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Test send state
  const [testOpen, setTestOpen] = useState(false);
  const [testContacts, setTestContacts] = useState<ContactItem[]>([]);
  const [testContactsLoading, setTestContactsLoading] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [testSelected, setTestSelected] = useState<Set<string>>(new Set());
  const [testSending, setTestSending] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testError, setTestError] = useState("");

  // Full send state
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; status: string } | null>(null);
  const [sendError, setSendError] = useState("");

  const page = pages.find(p => p.id === broadcast.pageId);
  const recipientCount = broadcast.totalRecipients ?? broadcast._count?.recipients ?? 0;
  const templateFields = (broadcast.template?.fields ?? []) as TemplateField[];
  const templateContent = broadcast.template?.content ?? "";

  // Live-rendered message reflects edits
  const renderedMessage = templateContent
    ? renderTemplate(templateContent, editValues)
    : (broadcast.message ?? "");

  const isBusy = saving || sending || testSending;

  // Fetch full broadcast details (with template fields) on mount
  useEffect(() => {
    fetch(`/api/broadcasts/${initialBroadcast.id}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcast?: EnrichedBroadcast } | null) => {
        if (d?.broadcast) {
          setBroadcast(d.broadcast);
          // Only reset editValues if not yet dirty
          setEditValues(prev => Object.keys(prev).length ? prev : (d.broadcast!.fieldValues ?? {}));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDetails(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load test contacts when test panel opens
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
        setBroadcast(prev => ({ ...prev, ...d.broadcast, template: prev.template }));
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
    setTestSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
      const d = await res.json() as {
        status?: string; sent?: number; failed?: number; broadcast?: BroadcastItem; error?: string;
      };
      if (res.ok && d.broadcast) {
        setSendResult({ sent: d.sent ?? 0, failed: d.failed ?? 0, status: d.status ?? "completed" });
        onSent(d.broadcast);
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

  // Count validation issues across all fields
  const fieldWarnings = templateFields.filter(f => {
    const warn = validateFieldValue(f.type, editValues[f.key] ?? "");
    return !!warn;
  }).length;
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
            </div>
          </div>
          {!isBusy && <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>}
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto flex-1 min-h-0">

          {sendResult ? (
            // ── Result ──
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: sendResult.failed === 0 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.12)" }}>
                {sendResult.failed === 0 ? <Check size={24} style={{ color: "#10B981" }} /> : <Send size={22} style={{ color: "#F59E0B" }} />}
              </div>
              <div className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>
                {sendResult.status === "completed" ? "Broadcast sent!" : "Broadcast failed"}
              </div>
              <div className="flex gap-4 text-[13px]">
                <span style={{ color: "#10B981" }}>{sendResult.sent} delivered</span>
                {sendResult.failed > 0 && <span style={{ color: "#EF4444" }}>{sendResult.failed} failed</span>}
              </div>
              {sendResult.failed > 0 && (
                <p className="text-[12px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
                  Failed recipients may have closed their 24-hour messaging window or unsubscribed.
                </p>
              )}
              <button onClick={onClose} className="mt-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: "#6C63FF" }}>Done</button>
            </div>

          ) : (
            <>
              {/* ── Field Values (editable) ── */}
              {templateFields.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
                      Message Fields
                    </span>
                    {loadingDetails && <Loader2 size={12} className="animate-spin" style={{ color: "#8B95A7" }} />}
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7" }}>
                              {f.key}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>
                              {FIELD_TYPE_LABELS[f.type]}
                            </span>
                            {hasIssue && (
                              <AlertCircle size={12} style={{ color: missingRequired ? "#EF4444" : "#F59E0B" }} />
                            )}
                          </div>
                          <FieldInput field={f} value={val} onChange={v => handleFieldChange(f.key, v)} />
                          {typeWarn && !missingRequired && (
                            <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: "#F59E0B" }}>
                              <AlertCircle size={10} /> {typeWarn}
                            </p>
                          )}
                          {missingRequired && (
                            <p className="text-[11px] mt-1" style={{ color: "#EF4444" }}>This field is required</p>
                          )}
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
                  {dirty && (
                    <p className="text-[11px] mt-1.5" style={{ color: "#F59E0B" }}>
                      Unsaved changes — save corrections before sending.
                    </p>
                  )}
                </section>
              )}

              {/* ── Rendered Message Preview ── */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
                    Rendered Message
                  </span>
                  {dirty && <span className="text-[10.5px]" style={{ color: "#F59E0B" }}>Preview (unsaved)</span>}
                </div>
                <div className="p-3 rounded-xl text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${dirty ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`, color: "#C8D0DC" }}>
                  {renderedMessage}
                </div>
                {!page && (
                  <div className="mt-2 p-3 rounded-xl flex items-start gap-2 text-[12.5px]"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> Facebook Page not loaded — please refresh.
                  </div>
                )}
              </section>

              {/* ── Test Send ── */}
              <section>
                <button
                  onClick={() => { setTestOpen(o => !o); setTestResults(null); setTestError(""); }}
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
                      Sends the exact message to up to 5 contacts. No DB state changes — recipient statuses stay "pending". Use this to verify the message looks correct in Messenger before sending to all {recipientCount} recipients.
                    </p>

                    {/* Test contact search */}
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
                          return (
                            <button key={c.id} onClick={() => canAdd && toggleTestContact(c.id)}
                              disabled={!canAdd}
                              className="flex items-center gap-2.5 p-2 rounded-lg text-left transition-all"
                              style={{ background: checked ? "rgba(108,99,255,0.08)" : "transparent", border: `1px solid ${checked ? "rgba(108,99,255,0.2)" : "transparent"}`, opacity: canAdd ? 1 : 0.4 }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                                style={{ background: checked ? "#6C63FF" : "rgba(255,255,255,0.08)", border: checked ? "none" : "1px solid rgba(255,255,255,0.15)" }}>
                                {checked && <Check size={9} color="#fff" />}
                              </div>
                              <span className="text-[12px]" style={{ color: "#F5F7FA" }}>{contactDisplayName(c)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {testSelected.size > 0 && (
                      <p className="text-[11px]" style={{ color: "#8B85FF" }}>
                        {testSelected.size} of 5 selected
                      </p>
                    )}

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
                            {r.success
                              ? <Check size={13} style={{ color: "#10B981" }} className="mt-0.5 shrink-0" />
                              : <AlertCircle size={13} style={{ color: "#EF4444" }} className="mt-0.5 shrink-0" />}
                            <div>
                              <span style={{ color: "#F5F7FA" }}>{r.name}</span>
                              {!r.success && r.error && (
                                <span className="ml-1.5 text-[11px]" style={{ color: "#EF4444" }}>{r.error}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={handleTestSend}
                      disabled={testSelected.size === 0 || testSending || dirty}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg text-[12.5px] font-semibold text-white"
                      style={{ background: "rgba(108,99,255,0.7)", opacity: (testSelected.size === 0 || testSending || dirty) ? 0.5 : 1 }}>
                      {testSending
                        ? <><Loader2 size={12} className="animate-spin" /> Sending test…</>
                        : <><Send size={12} /> Send test to {testSelected.size || "?"} contact{testSelected.size !== 1 ? "s" : ""}</>}
                    </button>
                  </div>
                )}
              </section>

              {/* ── Send errors ── */}
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
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
                Cancel
              </button>
            )}
            <button onClick={handleSendAll}
              disabled={isBusy || dirty || fieldErrors > 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: "#6C63FF", opacity: (isBusy || dirty || fieldErrors > 0) ? 0.5 : 1 }}>
              {sending
                ? <><Loader2 size={14} className="animate-spin" /> Sending to {recipientCount}…</>
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

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: "Select Page",
  2: "Choose Template",
  3: "Fill Fields",
  4: "Recipients",
  5: "Preview & Send",
};

function BroadcastWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { pages } = useWorkspace();
  const [step, setStep] = useState<Step>(1);

  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const [templates, setTemplates] = useState<GlobalTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplSearch, setTplSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<GlobalTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [broadcastName, setBroadcastName] = useState("");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [schedDate, setSchedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; status: string } | null>(null);
  const [error, setError] = useState("");

  const selectedPage = pages.find(p => p.id === pageId);

  useEffect(() => {
    if (step !== 2) return;
    setTplLoading(true);
    const params = new URLSearchParams();
    if (tplSearch) params.set("search", tplSearch);
    fetch(`/api/broadcast-templates?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { templates?: GlobalTemplate[] } | null) => { if (d?.templates) setTemplates(d.templates); })
      .catch(() => {})
      .finally(() => setTplLoading(false));
  }, [step, tplSearch]);

  useEffect(() => {
    if (step !== 4 || !pageId) return;
    setContactsLoading(true);
    const params = new URLSearchParams({ pageId, limit: "100" });
    if (contactSearch) params.set("search", contactSearch);
    fetch(`/api/contacts?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { contacts?: ContactItem[] } | null) => { if (d?.contacts) setContacts(d.contacts); })
      .catch(() => {})
      .finally(() => setContactsLoading(false));
  }, [step, pageId, contactSearch]);

  useEffect(() => {
    if (selectedTemplate) {
      const initial: Record<string, string> = {};
      (selectedTemplate.fields ?? []).forEach(f => { initial[f.key] = ""; });
      setFieldValues(initial);
    }
  }, [selectedTemplate]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedContacts(checked ? new Set(contacts.map(c => c.id)) : new Set());
  };

  const renderedMessage = selectedTemplate ? renderTemplate(selectedTemplate.content, fieldValues) : "";

  const fieldsValid = (): boolean => {
    if (!selectedTemplate) return false;
    for (const f of (selectedTemplate.fields ?? [])) {
      if (f.required && !(fieldValues[f.key] ?? "").trim()) return false;
    }
    return true;
  };

  const canAdvance = (): boolean => {
    if (step === 1) return !!pageId;
    if (step === 2) return !!selectedTemplate;
    if (step === 3) return !!broadcastName.trim() && fieldsValid();
    if (step === 4) return selectedContacts.size > 0;
    return !saving && !sending;
  };

  // Step 5 "Continue" creates the draft, then immediately sends
  const handleStep5 = async () => {
    if (!selectedTemplate || !pageId) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name: broadcastName.trim(),
        pageId,
        templateId: selectedTemplate.id,
        fieldValues,
        contactIds: [...selectedContacts],
      };
      if (schedule === "later" && schedDate) body.scheduledAt = schedDate;

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

      if (schedule === "later") {
        // Scheduled — done without sending now
        setSendResult({ sent: 0, failed: 0, status: "scheduled" });
        onCreated();
        return;
      }

      // Send immediately
      setSaving(false);
      setSending(true);
      const sendRes = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: "POST" });
      const sendData = await sendRes.json() as {
        status?: string; sent?: number; failed?: number; error?: string;
      };

      if (!sendRes.ok) {
        setError(sendData.error ?? "Broadcast saved as draft but sending failed.");
        onCreated(); // reload list so draft appears
        return;
      }

      setSendResult({
        sent: sendData.sent ?? 0,
        failed: sendData.failed ?? 0,
        status: sendData.status ?? "completed",
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
    if (step < 5) setStep(s => (s + 1) as Step);
    else handleStep5();
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
            {!sendResult && <p className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>Step {step} of 5 — {STEP_LABELS[step]}</p>}
          </div>
          {!isBusy && <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>}
        </div>

        {/* Step indicator */}
        {!sendResult && (
          <div className="flex items-center gap-1 px-6 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {([1, 2, 3, 4, 5] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{
                  background: step > s ? "#10B981" : step === s ? "#6C63FF" : "rgba(255,255,255,0.06)",
                  color: step >= s ? "#fff" : "#8B95A7",
                }}>
                  {step > s ? <Check size={10} /> : s}
                </div>
                {i < 4 && <div className="flex-1 h-px w-6" style={{ background: step > s ? "#10B981" : "rgba(255,255,255,0.07)" }} />}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        {sendResult ? (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: sendResult.status === "completed" ? "rgba(16,185,129,0.15)" : sendResult.status === "scheduled" ? "rgba(245,158,11,0.1)" : "rgba(108,99,255,0.12)" }}>
              {sendResult.status === "completed" ? <Check size={24} style={{ color: "#10B981" }} />
                : sendResult.status === "scheduled" ? <Circle size={22} style={{ color: "#F59E0B" }} />
                : <Send size={22} style={{ color: "#8B85FF" }} />}
            </div>
            <div className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>
              {sendResult.status === "completed" ? "Broadcast sent!" : sendResult.status === "scheduled" ? "Scheduled!" : "Sending…"}
            </div>
            {sendResult.status === "completed" && (
              <div className="flex items-center gap-4 text-[13px]">
                <span style={{ color: "#10B981" }}>{sendResult.sent} sent</span>
                {sendResult.failed > 0 && <span style={{ color: "#EF4444" }}>{sendResult.failed} failed</span>}
              </div>
            )}
            <button onClick={onClose} className="mt-1 px-5 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>Done</button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">

              {/* Step 1: Page */}
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

              {/* Step 2: Template */}
              {step === 2 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Choose a Message Template</p>
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
                  ) : templates.length === 0 ? (
                    <div className="py-8 text-center text-[13px]" style={{ color: "#8B95A7" }}>
                      {tplSearch ? "No templates match your search." : "No active templates available. Ask your admin to create one."}
                    </div>
                  ) : templates.map(t => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t)}
                      className="w-full flex items-start gap-3 p-3.5 rounded-xl mb-2 text-left transition-all"
                      style={{ background: selectedTemplate?.id === t.id ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${selectedTemplate?.id === t.id ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(108,99,255,0.12)" }}>
                        <FileText size={14} style={{ color: "#8B85FF" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</span>
                          {t.category && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>{t.category}</span>}
                        </div>
                        {t.description && <p className="text-[12px] mt-0.5 truncate" style={{ color: "#8B95A7" }}>{t.description}</p>}
                        {t.fields && t.fields.length > 0 && (
                          <p className="text-[11px] mt-1" style={{ color: "#6C63FF" }}>{t.fields.length} editable field{t.fields.length !== 1 ? "s" : ""}</p>
                        )}
                      </div>
                      {selectedTemplate?.id === t.id && <Check size={14} style={{ color: "#6C63FF" }} className="mt-1 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3: Fill Fields */}
              {step === 3 && selectedTemplate && (
                <div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7" }}>Broadcast Name *</label>
                    <input value={broadcastName} onChange={e => setBroadcastName(e.target.value)}
                      placeholder="e.g. Weekend Promo — Aug 2026"
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={inp} />
                  </div>
                  {(selectedTemplate.fields ?? []).length > 0 ? (
                    <div className="mt-4 flex flex-col gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Fill in the editable fields</p>
                      {(selectedTemplate.fields ?? []).map(f => (
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
                  ) : (
                    <div className="mt-4 p-3 rounded-xl text-[12.5px]" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#10B981" }}>
                      This template has no editable fields — the message is fully fixed.
                    </div>
                  )}
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>Live Preview</p>
                    <div className="p-3 rounded-xl text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", color: "#C8D0DC" }}>
                      {renderedMessage || <span style={{ color: "#8B95A7" }}>(preview appears as you fill in fields)</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Recipients */}
              {step === 4 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Select Recipients</p>
                    {contacts.length > 0 && (
                      <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: "#8B95A7" }}>
                        <input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} />
                        All ({contacts.length})
                      </label>
                    )}
                  </div>
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
                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                      {contacts.map(c => {
                        const checked = selectedContacts.has(c.id);
                        return (
                          <button key={c.id} onClick={() => {
                            setSelectedContacts(prev => {
                              const next = new Set(prev);
                              next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                              return next;
                            });
                          }}
                            className="flex items-center gap-3 p-2.5 rounded-lg text-left transition-all"
                            style={{ background: checked ? "rgba(108,99,255,0.08)" : "transparent", border: `1px solid ${checked ? "rgba(108,99,255,0.2)" : "transparent"}` }}>
                            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                              style={{ background: checked ? "#6C63FF" : "rgba(255,255,255,0.06)", border: checked ? "none" : "1px solid rgba(255,255,255,0.12)" }}>
                              {checked && <Check size={10} color="#fff" />}
                            </div>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>
                              {contactDisplayName(c).charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>{contactDisplayName(c)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedContacts.size > 0 && (
                    <div className="mt-3 text-[12px]" style={{ color: "#6C63FF" }}>
                      <Users size={11} className="inline mr-1" />{selectedContacts.size} recipient{selectedContacts.size !== 1 ? "s" : ""} selected
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Preview & Send */}
              {step === 5 && selectedTemplate && (
                <div>
                  <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Summary</div>
                    <div className="flex flex-col gap-2 text-[12.5px]">
                      <div className="flex justify-between"><span style={{ color: "#8B95A7" }}>Name</span><span style={{ color: "#F5F7FA" }}>{broadcastName}</span></div>
                      <div className="flex justify-between"><span style={{ color: "#8B95A7" }}>Page</span><span style={{ color: "#F5F7FA" }}>{selectedPage?.name}</span></div>
                      <div className="flex justify-between"><span style={{ color: "#8B95A7" }}>Template</span><span style={{ color: "#F5F7FA" }}>{selectedTemplate.name}</span></div>
                      <div className="flex justify-between"><span style={{ color: "#8B95A7" }}>Recipients</span><span style={{ color: "#F5F7FA" }}>{selectedContacts.size.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>Final Message</div>
                    <div className="p-3 rounded-xl text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", color: "#C8D0DC" }}>
                      {renderedMessage}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>When to send</div>
                    <div className="flex flex-col gap-2">
                      {(["now", "later"] as const).map(s => (
                        <button key={s} onClick={() => setSchedule(s)} className="flex items-center gap-3 p-3 rounded-xl text-left"
                          style={{ background: schedule === s ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${schedule === s ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                          <Circle size={8} fill={schedule === s ? "#6C63FF" : "transparent"} style={{ color: schedule === s ? "#6C63FF" : "#8B95A7" }} />
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
                      Your broadcast was saved as a draft. You can retry sending from the broadcasts list.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
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
                {sending ? (
                  <><Loader2 size={14} className="animate-spin" /> Sending…</>
                ) : saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving…</>
                ) : step < 5 ? "Continue"
                  : schedule === "now" ? <><Send size={14} /> Send Now</>
                  : "Schedule Broadcast"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BroadcastsPage() {
  const { pages } = useWorkspace();
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<BroadcastItem | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/broadcasts?limit=50")
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcasts?: BroadcastItem[] } | null) => { if (d?.broadcasts) setBroadcasts(d.broadcasts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDraftSent = (updated: BroadcastItem) => {
    setBroadcasts(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Broadcasts</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Send bulk messages using admin-approved templates.</p>
        </div>
        <button onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF" }}>
          <Plus size={14} /> New Broadcast
        </button>
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
          <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No broadcasts yet</div>
          <div className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
            Create your first broadcast using an admin-approved message template.
          </div>
          <button onClick={() => setShowWizard(true)}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: "#6C63FF" }}>
            <Plus size={14} /> Create Broadcast
          </button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Name", "Page", "Template", "Status", "Sent", "Created"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "#8B95A7" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b, i) => {
                const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.draft;
                const isDraft = b.status === "draft";
                return (
                  <tr
                    key={b.id}
                    onClick={isDraft ? () => setSelectedDraft(b) : undefined}
                    className={isDraft ? "cursor-pointer" : ""}
                    style={{
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={isDraft ? e => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(108,99,255,0.05)"; } : undefined}
                    onMouseLeave={isDraft ? e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; } : undefined}
                  >
                    <td className="px-4 py-3" style={{ color: "#F5F7FA" }}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{b.name}</span>
                        {isDraft && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                            style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF" }}>
                            <Send size={8} /> Send
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{pages.find(p => p.id === b.pageId)?.name ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{b.templateName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold capitalize"
                        style={{ background: sc.bg, color: sc.color }}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>
                      {b.status === "completed"
                        ? `${(b.sent ?? 0).toLocaleString()}${b.failed ? ` / ${b.failed} failed` : ""}`
                        : (b.totalRecipients ?? b._count?.recipients ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{fmt(b.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-2 text-[11px]" style={{ color: "rgba(139,149,167,0.5)" }}>
            Click a <span style={{ color: "#8B85FF" }}>draft</span> row to open it and send.
          </p>
        </div>
      )}

      {showWizard && <BroadcastWizard onClose={() => setShowWizard(false)} onCreated={() => { load(); setShowWizard(false); }} />}
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
