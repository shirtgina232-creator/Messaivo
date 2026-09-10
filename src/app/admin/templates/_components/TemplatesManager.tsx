"use client";

import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, Files, Check, AlertTriangle, Eye } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldType = "TEXT" | "NUMBER" | "URL" | "DATE" | "CURRENCY" | "TEXTAREA" | "DROPDOWN";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  maxLength?: number;
  placeholder?: string;
  options?: string[];
}

type TemplateStatus = "draft" | "active" | "inactive";

type GlobalTemplate = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  fields: TemplateField[] | null;
  category: string | null;
  isActive: boolean;
  status: TemplateStatus;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_CATEGORIES = ["Utility", "Reminder", "Confirmation", "Notification", "Customer Service"];
const FIELD_TYPES: FieldType[] = ["TEXT", "TEXTAREA", "NUMBER", "CURRENCY", "URL", "DATE", "DROPDOWN"];
const CONTACT_VARS = new Set(["first_name", "last_name", "name", "page_name"]);
const CONTACT_VAR_SAMPLES: Record<string, string> = {
  first_name: "Alex", last_name: "Johnson", name: "Alex Johnson", page_name: "Your Page",
};
const FIELD_SAMPLE: Record<FieldType, string> = {
  TEXT: "Sample text", TEXTAREA: "Sample paragraph", NUMBER: "42",
  CURRENCY: "25.00", URL: "https://example.com", DATE: "Jan 1, 2025", DROPDOWN: "Option A",
};

const STATUS_META: Record<TemplateStatus, { label: string; color: string; bg: string; border: string }> = {
  active:   { label: "Active",   color: "#10B981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)"  },
  draft:    { label: "Draft",    color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)"  },
  inactive: { label: "Inactive", color: "#8B95A7", bg: "rgba(139,149,167,0.1)", border: "rgba(139,149,167,0.2)"  },
};

const EMPTY_FORM = {
  name: "", description: "", content: "", fields: [] as TemplateField[],
  category: ADMIN_CATEGORIES[0], status: "draft" as TemplateStatus,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPreview(content: string, fields: TemplateField[]): string {
  const samples: Record<string, string> = { ...CONTACT_VAR_SAMPLES };
  for (const f of fields) samples[f.key] = f.placeholder || FIELD_SAMPLE[f.type] || "…";
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => samples[k] ?? `{{${k}}}`);
}

// ── Field Builder ─────────────────────────────────────────────────────────────

function FieldBuilder({ fields, onChange }: { fields: TemplateField[]; onChange: (f: TemplateField[]) => void }) {
  const [expanded, setExpanded] = useState(true);
  const add = () => onChange([...fields, { key: "", label: "", type: "TEXT", required: true }]);
  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<TemplateField>) =>
    onChange(fields.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const inp = "w-full px-2 py-1.5 rounded text-[12px] outline-none";
  const inpStyle = { background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: "rgba(255,255,255,0.03)" }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
          Editable Fields ({fields.length}) — use {`{{key}}`} in content
        </span>
        {expanded ? <ChevronUp size={14} style={{ color: "#8B95A7" }} /> : <ChevronDown size={14} style={{ color: "#8B95A7" }} />}
      </button>
      {expanded && (
        <div className="p-4 flex flex-col gap-3">
          {fields.length === 0 && (
            <p className="text-[12px]" style={{ color: "#8B95A7" }}>
              No editable fields. Add fields and reference them with {`{{key}}`} in the content.
            </p>
          )}
          {fields.map((f, i) => (
            <div key={i} className="p-3 rounded-lg flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-medium" style={{ color: "#F5F7FA" }}>Field {i + 1}</span>
                <button type="button" onClick={() => remove(i)} className="w-6 h-6 flex items-center justify-center rounded" style={{ color: "#EF4444", background: "rgba(239,68,68,0.08)" }}>
                  <X size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "#8B95A7" }}>Key (no spaces)</label>
                  <input className={inp} style={inpStyle} placeholder="e.g. payment_name"
                    value={f.key} onChange={e => update(i, { key: e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase() })} />
                </div>
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "#8B95A7" }}>Label (shown to user)</label>
                  <input className={inp} style={inpStyle} placeholder="e.g. Payment Name"
                    value={f.label} onChange={e => update(i, { label: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "#8B95A7" }}>Type</label>
                  <select className={inp} style={inpStyle} value={f.type} onChange={e => update(i, { type: e.target.value as FieldType })}>
                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "#8B95A7" }}>Placeholder</label>
                  <input className={inp} style={inpStyle} value={f.placeholder ?? ""}
                    onChange={e => update(i, { placeholder: e.target.value || undefined })} />
                </div>
                {f.type === "DROPDOWN" && (
                  <div className="col-span-2">
                    <label className="block text-[10px] mb-1" style={{ color: "#8B95A7" }}>Options (comma-separated)</label>
                    <input className={inp} style={inpStyle} placeholder="Option A,Option B"
                      value={(f.options ?? []).join(",")}
                      onChange={e => update(i, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={f.required} onChange={e => update(i, { required: e.target.checked })} />
                    <span className="text-[12px]" style={{ color: "#F5F7FA" }}>Required</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={add}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium self-start"
            style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)", color: "#8B85FF" }}>
            <Plus size={12} /> Add Field
          </button>
        </div>
      )}
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ name, onCancel, onConfirm, deleting }: {
  name: string; onCancel: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "#0A111B", border: "1px solid rgba(239,68,68,0.25)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
            <AlertTriangle size={18} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>Delete template?</div>
            <div className="text-[12px] mt-0.5 truncate max-w-[220px]" style={{ color: "#8B95A7" }}>&ldquo;{name}&rdquo;</div>
          </div>
        </div>
        <p className="text-[12.5px] leading-relaxed" style={{ color: "#8B95A7" }}>
          This permanently deletes the template. Existing broadcasts that referenced it will retain their rendered message.
        </p>
        <div className="flex gap-2 justify-end">
          <button className="text-[13px] font-medium px-4 py-2 rounded-lg"
            style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }} onClick={onCancel}>Cancel</button>
          <button className="text-[13px] font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-40"
            style={{ background: "#EF4444" }} disabled={deleting} onClick={onConfirm}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template Form (Create / Edit) ─────────────────────────────────────────────

function TemplateForm({ initial, onSave, onCancel, saving }: {
  initial: typeof EMPTY_FORM;
  onSave: (d: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [showPreview, setShowPreview] = useState(false);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const inp = "w-full px-3 py-2 rounded-lg text-[13px] outline-none";
  const inpStyle = { background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };
  const sm = STATUS_META[form.status];
  const preview = renderPreview(form.content, form.fields);

  return (
    <div className="p-5 rounded-xl mt-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Template Name *</label>
          <input type="text" className={inp} style={inpStyle} value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Category</label>
          <select className={inp} style={inpStyle} value={form.category} onChange={e => set("category", e.target.value)}>
            {ADMIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Description</label>
          <input type="text" className={inp} style={inpStyle} placeholder="Brief description shown to customers in the template picker"
            value={form.description} onChange={e => set("description", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Message Content *</label>
          <div className="text-[11px] mb-1.5" style={{ color: "#8B95A7" }}>
            Use <code className="px-1 rounded" style={{ background: "rgba(108,99,255,0.15)", color: "#8B85FF" }}>{`{{key}}`}</code> for editable fields.
            Contact vars auto-filled:{" "}
            {["first_name", "last_name", "name", "page_name"].map(v => (
              <code key={v} className="px-1 rounded mr-1" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>{`{{${v}}}`}</code>
            ))}
          </div>
          <textarea
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none font-mono"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
            rows={7}
            placeholder={"Hello {{first_name}},\n\nYour payment {{payment_name}} has been confirmed.\n\n{{additional_message}}\n\nReply if you need assistance."}
            value={form.content}
            onChange={e => set("content", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Status</label>
          <select
            className={inp} value={form.status} onChange={e => set("status", e.target.value as TemplateStatus)}
            style={{ ...inpStyle, color: sm.color }}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <p className="text-[10.5px] mt-1" style={{ color: "#8B95A7" }}>
            {form.status === "active" ? "Visible to customers in the Broadcast template picker."
              : form.status === "draft" ? "Not yet published. Only admins can see drafts."
              : "Deactivated. Hidden from customers."}
          </p>
        </div>
      </div>

      <FieldBuilder fields={form.fields} onChange={f => set("fields", f)} />

      {/* Live Preview */}
      {form.content && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-[11.5px] font-medium mb-2"
            style={{ color: showPreview ? "#8B85FF" : "#8B95A7" }}
          >
            <Eye size={13} /> {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          {showPreview && (
            <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7" }}>
                Message Preview (sample values)
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#6C63FF] flex items-center justify-center text-[9px] font-bold text-white">M</div>
                  <span className="text-[11px] font-semibold" style={{ color: "#F5F7FA" }}>Your Page</span>
                </div>
                <div className="p-3 rounded-xl text-[12.5px] text-white leading-relaxed whitespace-pre-wrap" style={{ background: "#6C63FF", borderRadius: "12px 12px 2px 12px" }}>
                  {preview}
                </div>
                <div className="flex items-center gap-1">
                  <Check size={10} style={{ color: "#10B981" }} />
                  <span className="text-[10px]" style={{ color: "#8B95A7" }}>Delivered</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={() => onSave(form)}
          disabled={saving || !form.name.trim() || !form.content.trim()}
          className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white"
          style={{ background: "#6C63FF", opacity: saving || !form.name.trim() || !form.content.trim() ? 0.5 : 1 }}>
          {saving ? "Saving…" : "Save Template"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-[12.5px]" style={{ color: "#8B95A7" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Templates Manager ─────────────────────────────────────────────────────────

const STATUS_FILTERS = ["All", "Active", "Draft", "Inactive"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function TemplatesManager({ initialTemplates }: { initialTemplates: GlobalTemplate[] }) {
  const [templates, setTemplates] = useState<GlobalTemplate[]>(initialTemplates);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GlobalTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [catFilter, setCatFilter] = useState("All");

  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { All: templates.length, Active: 0, Draft: 0, Inactive: 0 };
    for (const t of templates) {
      const s = t.status ?? (t.isActive ? "active" : "inactive");
      if (s === "active") c.Active++;
      else if (s === "draft") c.Draft++;
      else c.Inactive++;
    }
    return c;
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const tStatus = t.status ?? (t.isActive ? "active" : "inactive");
      const statusOk = statusFilter === "All" || tStatus === statusFilter.toLowerCase();
      const catOk = catFilter === "All" || t.category === catFilter;
      return statusOk && catOk;
    });
  }, [templates, statusFilter, catFilter]);

  async function handleCreate(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fields: form.fields.length ? form.fields : null }),
      });
      if (res.ok) {
        const { template } = await res.json() as { template: GlobalTemplate };
        setTemplates(p => [template, ...p]);
        setShowNew(false);
      }
    } finally { setSaving(false); }
  }

  async function handleEdit(id: string, form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fields: form.fields.length ? form.fields : null }),
      });
      if (res.ok) {
        const { template } = await res.json() as { template: GlobalTemplate };
        setTemplates(p => p.map(t => t.id === id ? template : t));
        setEditId(null);
      }
    } finally { setSaving(false); }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/templates/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) setTemplates(p => p.filter(t => t.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  async function handleDuplicate(t: GlobalTemplate) {
    setDuplicating(t.id);
    try {
      const res = await fetch(`/api/admin/templates/${t.id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const { template } = await res.json() as { template: GlobalTemplate };
        setTemplates(p => [template, ...p]);
      }
    } catch { /* silent */ }
    setDuplicating(null);
  }

  async function handleStatusToggle(t: GlobalTemplate, newStatus: TemplateStatus) {
    const res = await fetch(`/api/admin/templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const { template } = await res.json() as { template: GlobalTemplate };
      setTemplates(p => p.map(x => x.id === t.id ? template : x));
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Status filter */}
          <div className="flex gap-2">
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: statusFilter === s ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.04)",
                  color: statusFilter === s ? "#8B85FF" : "#8B95A7",
                  border: `1px solid ${statusFilter === s ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}`,
                }}>
                {s}
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums"
                  style={{ background: statusFilter === s ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.06)", color: statusFilter === s ? "#8B85FF" : "#8B95A7" }}>
                  {statusCounts[s]}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowNew(true); setEditId(null); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white"
            style={{ background: "#6C63FF" }}>
            <Plus size={14} /> New Template
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["All", ...ADMIN_CATEGORIES].map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className="shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: catFilter === c ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.03)",
                color: catFilter === c ? "#22D3EE" : "#8B95A7",
                border: `1px solid ${catFilter === c ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {showNew && (
        <TemplateForm initial={EMPTY_FORM} onSave={handleCreate} onCancel={() => setShowNew(false)} saving={saving} />
      )}

      {/* Template table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="grid gap-3 px-5 py-3 border-b" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          {["Name / Description", "Category", "Status", "Created", "Actions"].map(h => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>
            {templates.length === 0 ? "No templates yet. Create your first one above." : "No templates match the selected filters."}
          </div>
        )}

        {filtered.map(t => {
          const tStatus: TemplateStatus = (t.status ?? (t.isActive ? "active" : "inactive")) as TemplateStatus;
          const sm = STATUS_META[tStatus] ?? STATUS_META.inactive;
          return (
            <div key={t.id}>
              <div className="grid gap-3 px-5 py-4 border-b last:border-0 items-center"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.05)" }}>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</div>
                  <div className="text-[11px] truncate mt-0.5" style={{ color: "#8B95A7" }}>
                    {t.description ?? t.content.slice(0, 60)}{!t.description && t.content.length > 60 ? "…" : ""}
                  </div>
                  {t.fields && Array.isArray(t.fields) && t.fields.length > 0 && (
                    <div className="text-[10.5px] mt-0.5" style={{ color: "#6C63FF" }}>
                      {t.fields.length} editable field{t.fields.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <div className="text-[12px]" style={{ color: "#8B95A7" }}>{t.category ?? "—"}</div>
                <div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
                    {sm.label}
                  </span>
                </div>
                <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{fmt.format(new Date(t.createdAt))}</div>
                <div className="flex items-center gap-1">
                  {/* Activate / Deactivate quick toggle */}
                  {tStatus !== "active" && (
                    <button title="Activate"
                      onClick={() => handleStatusToggle(t, "active")}
                      className="h-6 px-2 flex items-center rounded-lg text-[10px] font-semibold"
                      style={{ color: "#10B981", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      Activate
                    </button>
                  )}
                  {tStatus === "active" && (
                    <button title="Deactivate"
                      onClick={() => handleStatusToggle(t, "inactive")}
                      className="h-6 px-2 flex items-center rounded-lg text-[10px] font-semibold"
                      style={{ color: "#8B95A7", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      Deactivate
                    </button>
                  )}
                  <button title="Duplicate" disabled={duplicating === t.id}
                    onClick={() => handleDuplicate(t)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-40"
                    style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                    <Files size={12} />
                  </button>
                  <button title="Edit"
                    onClick={() => { setEditId(editId === t.id ? null : t.id); setShowNew(false); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                    <Edit2 size={12} />
                  </button>
                  <button title="Delete"
                    onClick={() => setDeleteTarget(t)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ color: "#EF4444", background: "rgba(239,68,68,0.08)" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {editId === t.id && (
                <div className="px-5 pb-4">
                  <TemplateForm
                    initial={{
                      name: t.name,
                      description: t.description ?? "",
                      content: t.content,
                      fields: (t.fields as TemplateField[] | null) ?? [],
                      category: t.category ?? ADMIN_CATEGORIES[0],
                      status: tStatus,
                    }}
                    onSave={form => handleEdit(t.id, form)}
                    onCancel={() => setEditId(null)}
                    saving={saving}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </div>
  );
}
