"use client";

import { useState, useEffect } from "react";
import { Plus, Radio, X, Check, AlertCircle, Search, ChevronRight, Circle, FileText, Users } from "lucide-react";
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
  templateName: string | null;
  message: string | null;
  scheduledAt: string | null;
  createdAt: string;
  _count?: { recipients: number };
};

const STATUS_COLORS = {
  draft:     { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
  scheduled: { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
  completed: { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
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
      <textarea
        rows={3}
        className={`${base} resize-none`}
        style={style}
        placeholder={field.placeholder ?? ""}
        maxLength={field.maxLength}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
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

  const inputType = field.type === "DATE" ? "date" : field.type === "NUMBER" || field.type === "CURRENCY" ? "text" : field.type === "URL" ? "url" : "text";

  return (
    <input
      type={inputType}
      className={base}
      style={style}
      placeholder={field.placeholder ?? (field.type === "CURRENCY" ? "0.00" : field.type === "URL" ? "https://" : "")}
      maxLength={field.maxLength}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────────

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

  // Step 1
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");

  // Step 2
  const [templates, setTemplates] = useState<GlobalTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplSearch, setTplSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<GlobalTemplate | null>(null);

  // Step 3
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [broadcastName, setBroadcastName] = useState("");

  // Step 4
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Step 5 / submit
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [schedDate, setSchedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const selectedPage = pages.find(p => p.id === pageId);

  // Load templates when entering step 2
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

  // Load contacts when entering step 4
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

  // Reset field values when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const initial: Record<string, string> = {};
      (selectedTemplate.fields ?? []).forEach(f => { initial[f.key] = ""; });
      setFieldValues(initial);
    }
  }, [selectedTemplate]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) setSelectedContacts(new Set(contacts.map(c => c.id)));
    else setSelectedContacts(new Set());
  };

  const handleToggleContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderedMessage = selectedTemplate ? renderTemplate(selectedTemplate.content, fieldValues) : "";

  const fieldsValid = (): boolean => {
    if (!selectedTemplate) return false;
    for (const f of (selectedTemplate.fields ?? [])) {
      const val = (fieldValues[f.key] ?? "").trim();
      if (f.required && !val) return false;
    }
    return true;
  };

  const canAdvance = (): boolean => {
    if (step === 1) return !!pageId;
    if (step === 2) return !!selectedTemplate;
    if (step === 3) return !!broadcastName.trim() && fieldsValid();
    if (step === 4) return selectedContacts.size > 0;
    return !saving;
  };

  const handleSubmit = async () => {
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
      if (res.ok) {
        setSaved(true);
        setTimeout(() => { onCreated(); onClose(); }, 1400);
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to create broadcast.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step < 5) setStep(s => (s + 1) as Step);
    else handleSubmit();
  };

  const inp = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl overflow-hidden flex flex-col max-h-[88vh]" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>New Broadcast</h2>
            {!saved && <p className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>Step {step} of 5 — {STEP_LABELS[step]}</p>}
          </div>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
        </div>

        {/* Step indicator */}
        {!saved && (
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
        {saved ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <Check size={24} style={{ color: "#10B981" }} />
            </div>
            <div className="text-[16px] font-semibold" style={{ color: "#F5F7FA" }}>Broadcast created!</div>
            <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>Redirecting…</div>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">

              {/* ── Step 1: Page ── */}
              {step === 1 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Select Facebook Page</p>
                  {pages.length === 0 ? (
                    <div className="p-4 rounded-xl text-[13px]" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                      No connected pages. Connect a Facebook Page first.
                    </div>
                  ) : pages.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPageId(p.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-all text-left"
                      style={{ background: pageId === p.id ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${pageId === p.id ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: p.color }}>{p.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{p.name}</div>
                      </div>
                      {pageId === p.id && <Check size={14} style={{ color: "#6C63FF" }} />}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Step 2: Template ── */}
              {step === 2 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Choose a Message Template</p>
                  <div className="relative mb-3">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
                    <input
                      type="text"
                      placeholder="Search templates…"
                      value={tplSearch}
                      onChange={e => setTplSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none"
                      style={inp}
                    />
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
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className="w-full flex items-start gap-3 p-3.5 rounded-xl mb-2 text-left transition-all"
                      style={{ background: selectedTemplate?.id === t.id ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${selectedTemplate?.id === t.id ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}
                    >
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

              {/* ── Step 3: Fill Fields ── */}
              {step === 3 && selectedTemplate && (
                <div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7" }}>Broadcast Name *</label>
                    <input
                      value={broadcastName}
                      onChange={e => setBroadcastName(e.target.value)}
                      placeholder="e.g. Weekend Promo — Aug 2026"
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                      style={inp}
                    />
                  </div>

                  {(selectedTemplate.fields ?? []).length > 0 ? (
                    <div className="mt-4 flex flex-col gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Fill in the editable fields</p>
                      {(selectedTemplate.fields ?? []).map(f => (
                        <div key={f.key}>
                          <label className="flex items-center gap-1 text-[12px] font-medium mb-1.5" style={{ color: "#F5F7FA" }}>
                            {f.label}
                            {f.required && <span style={{ color: "#EF4444" }}>*</span>}
                            <span className="ml-auto text-[10px]" style={{ color: "#8B95A7" }}>{f.type}</span>
                          </label>
                          <FieldInput field={f} value={fieldValues[f.key] ?? ""} onChange={v => setFieldValues(prev => ({ ...prev, [f.key]: v }))} />
                          {f.maxLength && (
                            <div className="text-right text-[10px] mt-0.5" style={{ color: "#8B95A7" }}>{(fieldValues[f.key] ?? "").length} / {f.maxLength}</div>
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
                    <div className="p-3 rounded-xl text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", color: "#C8D0DC" }}>
                      {renderedMessage || <span style={{ color: "#8B95A7" }}>(preview will appear as you fill in fields)</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4: Recipients ── */}
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
                    <input
                      type="text"
                      placeholder="Search contacts…"
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none"
                      style={inp}
                    />
                  </div>
                  {contactsLoading ? (
                    <div className="flex flex-col gap-2">
                      {[1, 2, 3, 4].map(i => <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="py-8 text-center text-[13px]" style={{ color: "#8B95A7" }}>
                      {contactSearch ? "No contacts match your search." : "No contacts found for this page. Scan the page to import contacts first."}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                      {contacts.map(c => {
                        const checked = selectedContacts.has(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleToggleContact(c.id)}
                            className="flex items-center gap-3 p-2.5 rounded-lg text-left transition-all"
                            style={{ background: checked ? "rgba(108,99,255,0.08)" : "transparent", border: `1px solid ${checked ? "rgba(108,99,255,0.2)" : "transparent"}` }}
                          >
                            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: checked ? "#6C63FF" : "rgba(255,255,255,0.06)", border: checked ? "none" : "1px solid rgba(255,255,255,0.12)" }}>
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

              {/* ── Step 5: Preview & Send ── */}
              {step === 5 && selectedTemplate && (
                <div>
                  <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B95A7" }}>Broadcast Summary</div>
                    <div className="flex flex-col gap-2 text-[12.5px]">
                      <div className="flex justify-between">
                        <span style={{ color: "#8B95A7" }}>Name</span>
                        <span style={{ color: "#F5F7FA" }}>{broadcastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: "#8B95A7" }}>Page</span>
                        <span style={{ color: "#F5F7FA" }}>{selectedPage?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: "#8B95A7" }}>Template</span>
                        <span style={{ color: "#F5F7FA" }}>{selectedTemplate.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: "#8B95A7" }}>Recipients</span>
                        <span style={{ color: "#F5F7FA" }}>{selectedContacts.size.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>Final Message</div>
                    <div className="p-3 rounded-xl text-[12.5px] whitespace-pre-wrap font-mono leading-relaxed" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", color: "#C8D0DC" }}>
                      {renderedMessage}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>When to send</div>
                    <div className="flex flex-col gap-2">
                      {(["now", "later"] as const).map(s => (
                        <button key={s} onClick={() => setSchedule(s)} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: schedule === s ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${schedule === s ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                          <Circle size={8} fill={schedule === s ? "#6C63FF" : "transparent"} style={{ color: schedule === s ? "#6C63FF" : "#8B95A7" }} />
                          <span className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{s === "now" ? "Send immediately (save as draft)" : "Schedule for later"}</span>
                        </button>
                      ))}
                    </div>
                    {schedule === "later" && (
                      <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none mt-2" style={inp} />
                    )}
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                      <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              {step > 1 && (
                <button onClick={() => setStep(s => (s - 1) as Step)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
                  Back
                </button>
              )}
              <button
                onClick={goNext}
                disabled={!canAdvance()}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                style={{ background: "#6C63FF", opacity: canAdvance() ? 1 : 0.4 }}
              >
                {step < 5 ? "Continue" : saving ? "Creating…" : "Create Broadcast"}
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

  const load = () => {
    setLoading(true);
    fetch("/api/broadcasts?limit=50")
      .then(r => r.ok ? r.json() : null)
      .then((d: { broadcasts?: BroadcastItem[] } | null) => { if (d?.broadcasts) setBroadcasts(d.broadcasts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Broadcasts</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Send bulk messages using admin-approved templates.</p>
        </div>
        <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>
          <Plus size={14} /> New Broadcast
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Radio size={36} style={{ color: "#8B95A7", opacity: 0.25 }} />
          <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No broadcasts yet</div>
          <div className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>Create your first broadcast using an admin-approved message template.</div>
          <button onClick={() => setShowWizard(true)} className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>
            <Plus size={14} /> Create Broadcast
          </button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Name", "Page", "Template", "Status", "Recipients", "Created"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "#8B95A7" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b, i) => {
                const sc = STATUS_COLORS[b.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.draft;
                return (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "#F5F7FA" }}>{b.name}</td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{pages.find(p => p.id === b.pageId)?.name ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{b.templateName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold capitalize" style={{ background: sc.bg, color: sc.color }}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{(b._count?.recipients ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3" style={{ color: "#8B95A7" }}>{fmt(b.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showWizard && <BroadcastWizard onClose={() => setShowWizard(false)} onCreated={load} />}
    </div>
  );
}
