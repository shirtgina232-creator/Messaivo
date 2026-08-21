"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";

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

type GlobalTemplate = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  fields: TemplateField[] | null;
  category: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const FIELD_TYPES: FieldType[] = ["TEXT", "TEXTAREA", "NUMBER", "CURRENCY", "URL", "DATE", "DROPDOWN"];

const EMPTY_FIELD: TemplateField = { key: "", label: "", type: "TEXT", required: true };
const EMPTY_FORM = {
  name: "", description: "", content: "", fields: [] as TemplateField[], category: "", isActive: true,
};

// ── Field Builder ─────────────────────────────────────────────────────────────

function FieldBuilder({ fields, onChange }: { fields: TemplateField[]; onChange: (f: TemplateField[]) => void }) {
  const [expanded, setExpanded] = useState(true);

  const add = () => onChange([...fields, { ...EMPTY_FIELD }]);
  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<TemplateField>) =>
    onChange(fields.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  const inp = "w-full px-2 py-1.5 rounded text-[12px] outline-none";
  const inpStyle = { background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
          Editable Fields ({fields.length}) — use {"{{key}}"} in content
        </span>
        {expanded ? <ChevronUp size={14} style={{ color: "#8B95A7" }} /> : <ChevronDown size={14} style={{ color: "#8B95A7" }} />}
      </button>

      {expanded && (
        <div className="p-4 flex flex-col gap-3">
          {fields.length === 0 && (
            <p className="text-[12px]" style={{ color: "#8B95A7" }}>
              No editable fields. Add fields below and reference them in the content with {"{{key}}"}.
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
                  <input
                    className={inp} style={inpStyle}
                    placeholder="e.g. offer_amount"
                    value={f.key}
                    onChange={e => update(i, { key: e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase() })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "#8B95A7" }}>Label (shown to user)</label>
                  <input
                    className={inp} style={inpStyle}
                    placeholder="e.g. Offer Amount"
                    value={f.label}
                    onChange={e => update(i, { label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "#8B95A7" }}>Type</label>
                  <select
                    className={inp} style={inpStyle}
                    value={f.type}
                    onChange={e => update(i, { type: e.target.value as FieldType })}
                  >
                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="block text-[10px]" style={{ color: "#8B95A7" }}>Max Length</label>
                  <input
                    type="number" min={1} max={4096}
                    className={inp} style={inpStyle}
                    placeholder="no limit"
                    value={f.maxLength ?? ""}
                    onChange={e => update(i, { maxLength: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "#8B95A7" }}>Placeholder</label>
                  <input
                    className={inp} style={inpStyle}
                    value={f.placeholder ?? ""}
                    onChange={e => update(i, { placeholder: e.target.value || undefined })}
                  />
                </div>
                {f.type === "DROPDOWN" && (
                  <div>
                    <label className="block text-[10px] mb-1" style={{ color: "#8B95A7" }}>Options (comma-separated)</label>
                    <input
                      className={inp} style={inpStyle}
                      placeholder="Option A,Option B,Option C"
                      value={(f.options ?? []).join(",")}
                      onChange={e => update(i, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    />
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

          <button
            type="button"
            onClick={add}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium self-start"
            style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)", color: "#8B85FF" }}
          >
            <Plus size={12} /> Add Field
          </button>
        </div>
      )}
    </div>
  );
}

// ── Template Form ─────────────────────────────────────────────────────────────

function TemplateForm({ initial, onSave, onCancel, saving }: {
  initial: typeof EMPTY_FORM;
  onSave: (d: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const inp = "w-full px-3 py-2 rounded-lg text-[13px] outline-none";
  const inpStyle = { background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" };

  return (
    <div className="p-5 rounded-xl mt-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Template Name *</label>
          <input type="text" className={inp} style={inpStyle} value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Category</label>
          <input type="text" className={inp} style={inpStyle} placeholder="e.g. Promotional, Welcome" value={form.category} onChange={e => set("category", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Short Description</label>
          <input type="text" className={inp} style={inpStyle} placeholder="Shown to users in the template picker" value={form.description} onChange={e => set("description", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Content *</label>
          <div className="text-[11px] mb-1.5" style={{ color: "#8B95A7" }}>
            Fixed text + editable placeholders: use <code className="px-1 rounded" style={{ background: "rgba(108,99,255,0.15)", color: "#8B85FF" }}>{"{{key}}"}</code> where customers can fill in values
          </div>
          <textarea
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none font-mono"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
            rows={7}
            placeholder={"🎉 SPECIAL OFFER\n\nHello! We have an exclusive offer just for you.\n\n{{headline}}\n\nBonus: {{offer_amount}}%\nPromo Code: {{promo_code}}\nValid until: {{expiry_date}}\n\nClaim now: {{cta_url}}"}
            value={form.content}
            onChange={e => set("content", e.target.value)}
          />
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
            <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>Active (visible to users)</span>
          </label>
        </div>
      </div>

      <FieldBuilder fields={form.fields} onChange={f => set("fields", f)} />

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim() || !form.content.trim()}
          className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white"
          style={{ background: "#6C63FF", opacity: saving || !form.name.trim() || !form.content.trim() ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save Template"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-[12.5px]" style={{ color: "#8B95A7" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Templates Manager ─────────────────────────────────────────────────────────

export default function TemplatesManager({ initialTemplates }: { initialTemplates: GlobalTemplate[] }) {
  const [templates, setTemplates] = useState<GlobalTemplate[]>(initialTemplates);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

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

  async function handleDelete(id: string) {
    if (!confirm("Delete this template? Existing broadcasts that used it will retain their rendered message.")) return;
    const res = await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates(p => p.filter(t => t.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "#8B95A7" }}>{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
        <button
          onClick={() => { setShowNew(true); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white"
          style={{ background: "#6C63FF" }}
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      {showNew && (
        <TemplateForm
          initial={EMPTY_FORM}
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
          saving={saving}
        />
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="grid gap-3 px-5 py-3 border-b" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          {["Name", "Category", "Status", "Created", "Actions"].map(h => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No global templates yet.</div>
        )}

        {templates.map(t => (
          <div key={t.id}>
            <div className="grid gap-3 px-5 py-4 border-b last:border-0 items-center" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.05)" }}>
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
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: t.isActive ? "#10B981" : "#EF4444", background: t.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
                  {t.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{fmt.format(new Date(t.createdAt))}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditId(editId === t.id ? null : t.id); setShowNew(false); }} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                  <Edit2 size={12} />
                </button>
                <button onClick={() => handleDelete(t.id)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#EF4444", background: "rgba(239,68,68,0.08)" }}>
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
                    category: t.category ?? "",
                    isActive: t.isActive,
                  }}
                  onSave={form => handleEdit(t.id, form)}
                  onCancel={() => setEditId(null)}
                  saving={saving}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
