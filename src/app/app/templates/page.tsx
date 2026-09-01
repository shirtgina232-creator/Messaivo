"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, FileText, Edit2, Trash2, X, Check, Copy } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type FieldType = "TEXT" | "NUMBER" | "DATE" | "CURRENCY" | "URL";

interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
}

type Template = {
  id: string;
  name: string;
  category: string | null;
  content: string;
  fields: TemplateField[] | null;
  updatedAt: string;
  usageCount: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ["All", "Greeting", "Follow-up", "Support", "Reminder", "Thank-you"];

/** Keys automatically resolved from contact/page data — never shown as custom fields. */
const CONTACT_VARS = new Set(["first_name", "last_name", "name", "page_name"]);

const CONTACT_VAR_SAMPLES: Record<string, string> = {
  first_name: "Alex",
  last_name: "Johnson",
  name: "Alex Johnson",
  page_name: "Your Page",
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text", NUMBER: "Number", DATE: "Date", CURRENCY: "Currency", URL: "URL",
};

const SAMPLE_VALUES: Record<FieldType, string> = {
  TEXT: "Sample text",
  NUMBER: "42",
  DATE: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  CURRENCY: "25.00",
  URL: "https://example.com",
};

// ── Variable Detection ────────────────────────────────────────────────────────

function detectVars(content: string): string[] {
  const matches = [...content.matchAll(/\{\{(\w+)\}\}/g)];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    if (!seen.has(m[1])) { seen.add(m[1]); result.push(m[1]); }
  }
  return result;
}

function renderPreview(
  content: string,
  customFields: TemplateField[],
  customFieldValues: Record<string, string>,
  pageName: string,
): string {
  const samples: Record<string, string> = {
    ...CONTACT_VAR_SAMPLES,
    page_name: pageName,
  };
  for (const f of customFields) {
    samples[f.key] = customFieldValues[f.key]?.trim() || SAMPLE_VALUES[f.type] || "…";
  }
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => samples[key] ?? `{{${key}}}`);
}

// ── Template Modal ────────────────────────────────────────────────────────────

function TemplateModal({ template, onClose, onSave }: {
  template?: Template;
  onClose: () => void;
  onSave: (t: Template) => void;
}) {
  const { pages } = useWorkspace();
  const previewPageName = pages[0]?.name ?? "Your Page";

  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState(template?.category ?? "Greeting");
  const [body, setBody] = useState(template?.content ?? "");
  const [customFields, setCustomFields] = useState<TemplateField[]>(
    () => (template?.fields ?? []).filter(f => !CONTACT_VARS.has(f.key))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const detectedVars = useMemo(() => detectVars(body), [body]);
  const contactVarsInBody = detectedVars.filter(k => CONTACT_VARS.has(k));
  const customVarKeys = detectedVars.filter(k => !CONTACT_VARS.has(k));

  // Sync customFields when new custom vars appear or disappear from body
  useEffect(() => {
    setCustomFields(prev => {
      const next: TemplateField[] = [];
      for (const key of customVarKeys) {
        const existing = prev.find(f => f.key === key);
        next.push(existing ?? { key, label: key.replace(/_/g, " "), type: "TEXT", required: true });
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  const updateField = (key: string, patch: Partial<TemplateField>) => {
    setCustomFields(prev => prev.map(f => f.key === key ? { ...f, ...patch } : f));
  };

  const insertVar = (v: string) => setBody(prev => prev + `{{${v}}}`);

  const preview = renderPreview(body, customFields, {}, previewPageName);

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    setError("");
    try {
      // Build fields array: contact vars as read-only markers + custom fields
      const fieldsPayload: TemplateField[] = [
        ...contactVarsInBody.map(k => ({
          key: k,
          label: CONTACT_VAR_SAMPLES[k] ? k.replace(/_/g, " ") : k,
          type: "TEXT" as FieldType,
          required: false,
        })),
        ...customFields,
      ];

      let res: Response;
      if (template) {
        res = await fetch(`/api/templates/${template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), content: body.trim(), category, fields: fieldsPayload }),
        });
      } else {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), content: body.trim(), category, fields: fieldsPayload }),
        });
      }
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json() as { template: Template };
      setSaved(true);
      setTimeout(() => { onSave(data.template); onClose(); }, 900);
    } catch {
      setError("Failed to save template. Please try again.");
      setSaving(false);
    }
  };

  const inp = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{template ? "Edit Template" : "New Template"}</h2>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <Check size={22} style={{ color: "#10B981" }} />
            </div>
            <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Template saved!</div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 gap-0 divide-x h-full" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {/* Editor */}
                <div className="p-5 flex flex-col gap-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Template Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Appointment Reminder"
                      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                      style={inp}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Category</label>
                    <select
                      value={category ?? "Greeting"}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none cursor-pointer"
                      style={inp}
                    >
                      {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Message Body</label>
                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      rows={5}
                      placeholder={"Hi {{first_name}}, this is a reminder about your upcoming appointment on {{appointment_date}}."}
                      className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-none"
                      style={inp}
                    />
                  </div>

                  {/* Quick-insert contact variables */}
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7", opacity: 0.6 }}>
                      Contact Variables <span className="font-normal normal-case" style={{ opacity: 0.7 }}>— auto-filled per recipient</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["first_name", "last_name", "name", "page_name"].map(v => (
                        <button key={v} className="text-[10px] font-mono px-2 py-1 rounded transition-colors" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }} onClick={() => insertVar(v)}>
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detected custom variables */}
                  {customVarKeys.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7", opacity: 0.6 }}>
                        Custom Variables <span className="font-normal normal-case" style={{ opacity: 0.7 }}>— you fill these at broadcast time</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {customFields.map(f => (
                          <div key={f.key} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)" }}>
                            <span className="text-[10px] font-mono shrink-0" style={{ color: "#8B85FF" }}>{`{{${f.key}}}`}</span>
                            <input
                              value={f.label}
                              onChange={e => updateField(f.key, { label: e.target.value })}
                              placeholder="Label"
                              className="flex-1 min-w-0 px-2 py-1 rounded text-[11px] outline-none"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                            />
                            <select
                              value={f.type}
                              onChange={e => updateField(f.key, { type: e.target.value as FieldType })}
                              className="text-[10px] px-1.5 py-1 rounded outline-none cursor-pointer shrink-0"
                              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#8B95A7" }}
                            >
                              {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map(t => (
                                <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                              ))}
                            </select>
                            <label className="flex items-center gap-1 text-[10px] shrink-0" style={{ color: "#8B95A7" }}>
                              <input type="checkbox" checked={f.required} onChange={e => updateField(f.key, { required: e.target.checked })} className="w-3 h-3" />
                              Req
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {error && <p className="text-[11.5px] text-red-400">{error}</p>}
                </div>

                {/* Preview */}
                <div className="p-5 flex flex-col gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7", opacity: 0.6 }}>Live Preview</div>

                  {/* Detected variable legend */}
                  {detectedVars.length > 0 && (
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      {contactVarsInBody.length > 0 && (
                        <div>
                          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#10B981", opacity: 0.8 }}>Auto-filled</div>
                          {contactVarsInBody.map(k => (
                            <div key={k} className="flex items-center gap-2 text-[10.5px]">
                              <span className="font-mono" style={{ color: "#10B981" }}>{`{{${k}}}`}</span>
                              <span style={{ color: "#8B95A7" }}>→ {CONTACT_VAR_SAMPLES[k]}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {customVarKeys.length > 0 && (
                        <div className={contactVarsInBody.length > 0 ? "mt-1.5 pt-1.5 border-t" : ""} style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#8B85FF", opacity: 0.8 }}>Fill at broadcast time</div>
                          {customFields.map(f => (
                            <div key={f.key} className="flex items-center gap-2 text-[10.5px]">
                              <span className="font-mono" style={{ color: "#8B85FF" }}>{`{{${f.key}}}`}</span>
                              <span style={{ color: "#8B95A7" }}>→ {SAMPLE_VALUES[f.type]}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {body ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-[#6C63FF] flex items-center justify-center text-[9px] font-bold text-white">M</div>
                        <span className="text-[11px] font-semibold" style={{ color: "#F5F7FA" }}>{previewPageName}</span>
                      </div>
                      <div className="p-3 rounded-xl text-[12px] text-white leading-relaxed whitespace-pre-wrap" style={{ background: "#6C63FF", borderRadius: "12px 12px 2px 12px" }}>
                        {preview}
                      </div>
                      <div className="flex items-center gap-1">
                        <Check size={10} style={{ color: "#10B981" }} />
                        <span className="text-[10px]" style={{ color: "#8B95A7" }}>Delivered</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[12px]" style={{ color: "#8B95A7", opacity: 0.5 }}>
                      Start typing to see preview
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <button className="text-[13px] font-medium px-4 py-2 rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }} onClick={onClose}>Cancel</button>
              <button
                className="text-[13px] font-semibold px-5 py-2 rounded-lg text-white transition-all disabled:opacity-40"
                style={{ background: "#6C63FF" }}
                disabled={!name.trim() || !body.trim() || saving}
                onClick={handleSave}
              >
                {saving ? "Saving…" : template ? "Save changes" : "Create template"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | undefined>();
  const [catFilter, setCatFilter] = useState("All");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates?limit=50")
      .then(r => r.ok ? r.json() : { templates: [] })
      .then(({ templates: t }: { templates: Template[] }) => setTemplates(t ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = catFilter === "All"
    ? templates
    : templates.filter(t => t.category === catFilter);

  const handleSave = (t: Template) => {
    setTemplates(prev => {
      const idx = prev.findIndex(x => x.id === t.id);
      if (idx >= 0) return prev.map(x => x.id === t.id ? t : x);
      return [t, ...prev];
    });
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const customVarCount = (t: Template) =>
    (t.fields ?? []).filter(f => !CONTACT_VARS.has(f.key)).length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Message Templates</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Create reusable message templates with dynamic variables. Use these in Broadcasts.</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF", boxShadow: "0 0 20px rgba(108,99,255,0.25)" }}
          onClick={() => { setEditing(undefined); setModalOpen(true); }}
        >
          <Plus size={15} /> New Template
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className="shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: catFilter === c ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.04)",
              color: catFilter === c ? "#8B85FF" : "#8B95A7",
              border: `1px solid ${catFilter === c ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[13px]" style={{ color: "#8B95A7" }}>Loading templates…</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="p-5 rounded-xl flex flex-col gap-3 group" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(108,99,255,0.12)" }}>
                    <FileText size={14} style={{ color: "#6C63FF" }} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</div>
                    <div className="text-[10.5px]" style={{ color: "#8B95A7" }}>{t.category ?? "General"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                    onClick={() => handleCopy(t.content, t.id)}
                  >
                    {copied === t.id ? <Check size={12} style={{ color: "#10B981" }} /> : <Copy size={12} />}
                  </button>
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                    onClick={() => { setEditing(t); setModalOpen(true); }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ color: "#EF4444", background: "rgba(239,68,68,0.1)" }}
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <p className="text-[12px] leading-relaxed line-clamp-3 font-mono" style={{ color: "#8B95A7" }}>{t.content}</p>

              {/* Variable tags */}
              {(t.fields ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(t.fields ?? []).filter(f => CONTACT_VARS.has(f.key)).map(f => (
                    <span key={f.key} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.15)" }}>
                      {`{{${f.key}}}`}
                    </span>
                  ))}
                  {customVarCount(t) > 0 && (
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(108,99,255,0.08)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.15)" }}>
                      {customVarCount(t)} custom field{customVarCount(t) !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="text-[10.5px]" style={{ color: "#8B95A7" }}>
                  Updated {new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span className="text-[10.5px]" style={{ color: "#8B95A7" }}>Used {t.usageCount}×</span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="md:col-span-2 xl:col-span-3 text-center py-12 text-[13px]" style={{ color: "#8B95A7" }}>
              {catFilter === "All" ? "No templates yet. Create your first one!" : `No templates in "${catFilter}".`}
            </div>
          )}

          {/* Add card */}
          <button
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed min-h-[160px] transition-all"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "#8B95A7" }}
            onClick={() => { setEditing(undefined); setModalOpen(true); }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(108,99,255,0.35)"; e.currentTarget.style.color = "#8B85FF"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#8B95A7"; }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Plus size={16} />
            </div>
            <span className="text-[13px] font-semibold">New Template</span>
          </button>
        </div>
      )}

      {modalOpen && (
        <TemplateModal
          template={editing}
          onClose={() => { setModalOpen(false); setEditing(undefined); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
