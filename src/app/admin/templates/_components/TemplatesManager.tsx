"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";

type GlobalTemplate = {
  id: string; name: string; content: string; category: string | null;
  isActive: boolean; createdBy: string | null; createdAt: Date; updatedAt: Date;
};

const EMPTY_FORM = { name: "", content: "", category: "", isActive: true };

function TemplateForm({ initial, onSave, onCancel, saving }: {
  initial: typeof EMPTY_FORM; onSave: (d: typeof EMPTY_FORM) => void; onCancel: () => void; saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="p-5 rounded-xl mt-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Template Name</label>
          <input type="text" className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Category</label>
          <input type="text" className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} placeholder="e.g. Greetings, Support" value={form.category} onChange={(e) => set("category", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Content</label>
          <textarea className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} rows={4} placeholder="Template message content..." value={form.content} onChange={(e) => set("content", e.target.value)} />
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
            <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>Active</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.content} className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF", opacity: saving || !form.name ? 0.5 : 1 }}>
          {saving ? "Saving…" : "Save Template"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[12.5px]" style={{ color: "#8B95A7" }}>Cancel</button>
      </div>
    </div>
  );
}

export default function TemplatesManager({ initialTemplates }: { initialTemplates: GlobalTemplate[] }) {
  const [templates, setTemplates] = useState<GlobalTemplate[]>(initialTemplates);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

  async function handleCreate(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { const { template } = await res.json(); setTemplates((p) => [template, ...p]); setShowNew(false); }
    } finally { setSaving(false); }
  }

  async function handleEdit(id: string, form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { const { template } = await res.json(); setTemplates((p) => p.map((t) => t.id === id ? template : t)); setEditId(null); }
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates((p) => p.filter((t) => t.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "#8B95A7" }}>{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
        <button onClick={() => { setShowNew(true); setEditId(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF" }}>
          <Plus size={14} /> New Template
        </button>
      </div>
      {showNew && <TemplateForm initial={EMPTY_FORM} onSave={handleCreate} onCancel={() => setShowNew(false)} saving={saving} />}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="grid gap-3 px-5 py-3 border-b" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          {["Name", "Category", "Status", "Created", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {templates.length === 0 && <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No global templates yet.</div>}
        {templates.map((t) => (
          <div key={t.id}>
            <div className="grid gap-3 px-5 py-4 border-b last:border-0 items-center" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.05)" }}>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</div>
                <div className="text-[11px] truncate mt-0.5" style={{ color: "#8B95A7" }}>{t.content.slice(0, 60)}{t.content.length > 60 ? "…" : ""}</div>
              </div>
              <div className="text-[12px]" style={{ color: "#8B95A7" }}>{t.category ?? "—"}</div>
              <div><span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: t.isActive ? "#10B981" : "#EF4444", background: t.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>{t.isActive ? "Active" : "Inactive"}</span></div>
              <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{fmt.format(new Date(t.createdAt))}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditId(editId === t.id ? null : t.id); setShowNew(false); }} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}><Edit2 size={12} /></button>
                <button onClick={() => handleDelete(t.id)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#EF4444", background: "rgba(239,68,68,0.08)" }}><Trash2 size={12} /></button>
              </div>
            </div>
            {editId === t.id && (
              <div className="px-5 pb-4">
                <TemplateForm
                  initial={{ name: t.name, content: t.content, category: t.category ?? "", isActive: t.isActive }}
                  onSave={(form) => handleEdit(t.id, form)}
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
