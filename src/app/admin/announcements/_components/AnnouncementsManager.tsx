"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";

type Announcement = {
  id: string; title: string; message: string; type: string;
  ctaText: string | null; ctaUrl: string | null;
  startDate: Date | null; endDate: Date | null;
  isActive: boolean; isDismissible: boolean; createdAt: Date; updatedAt: Date;
};

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  info:        { color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  success:     { color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  warning:     { color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  promotional: { color: "#A78BFA", bg: "rgba(167,139,250,0.1)" },
};

const EMPTY_FORM = {
  title: "", message: "", type: "info", ctaText: "", ctaUrl: "",
  startDate: "", endDate: "", isActive: true, isDismissible: true,
};

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
}

function AnnouncementForm({ initial, onSave, onCancel, saving }: {
  initial: typeof EMPTY_FORM; onSave: (d: typeof EMPTY_FORM) => void; onCancel: () => void; saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="p-5 rounded-xl mt-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Title</label>
          <input type="text" className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Type</label>
          <select className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {Object.keys(TYPE_COLORS).map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Message</label>
          <textarea className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} />
        </div>
        {[{ key: "ctaText", label: "CTA Button Text" }, { key: "ctaUrl", label: "CTA URL" }, { key: "startDate", label: "Start Date", type: "date" }, { key: "endDate", label: "End Date", type: "date" }].map(({ key, label, type = "text" }) => (
          <div key={key}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>{label}</label>
            <input type={type} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} value={form[key as keyof typeof EMPTY_FORM] as string} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
        <div className="flex items-center gap-6">
          {[{ key: "isActive", label: "Active" }, { key: "isDismissible", label: "Dismissible" }].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={Boolean(form[key as keyof typeof EMPTY_FORM])} onChange={(e) => set(key, e.target.checked)} />
              <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(form)} disabled={saving || !form.title || !form.message} className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF", opacity: saving || !form.title ? 0.5 : 1 }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[12.5px]" style={{ color: "#8B95A7" }}>Cancel</button>
      </div>
    </div>
  );
}

function announcementToForm(a: Announcement): typeof EMPTY_FORM {
  return {
    title: a.title, message: a.message, type: a.type,
    ctaText: a.ctaText ?? "", ctaUrl: a.ctaUrl ?? "",
    startDate: a.startDate ? new Date(a.startDate).toISOString().split("T")[0] : "",
    endDate: a.endDate ? new Date(a.endDate).toISOString().split("T")[0] : "",
    isActive: a.isActive, isDismissible: a.isDismissible,
  };
}

export default function AnnouncementsManager({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { const { announcement } = await res.json(); setAnnouncements((p) => [announcement, ...p]); setShowNew(false); }
    } finally { setSaving(false); }
  }

  async function handleEdit(id: string, form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { const { announcement } = await res.json(); setAnnouncements((p) => p.map((a) => a.id === id ? announcement : a)); setEditId(null); }
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    if (res.ok) setAnnouncements((p) => p.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "#8B95A7" }}>{announcements.length} announcement{announcements.length !== 1 ? "s" : ""}</span>
        <button onClick={() => { setShowNew(true); setEditId(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF" }}>
          <Plus size={14} /> New Announcement
        </button>
      </div>
      {showNew && <AnnouncementForm initial={EMPTY_FORM} onSave={handleCreate} onCancel={() => setShowNew(false)} saving={saving} />}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="grid gap-3 px-5 py-3 border-b" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          {["Title", "Type", "Status", "Dates", "Dismissible", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {announcements.length === 0 && <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No announcements yet.</div>}
        {announcements.map((a) => {
          const tc = TYPE_COLORS[a.type] ?? TYPE_COLORS.info;
          return (
            <div key={a.id}>
              <div className="grid gap-3 px-5 py-4 border-b last:border-0 items-center" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.05)" }}>
                <div>
                  <div className="text-[13px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{a.title}</div>
                  <div className="text-[11px] truncate" style={{ color: "#8B95A7" }}>{a.message.slice(0, 60)}{a.message.length > 60 ? "…" : ""}</div>
                </div>
                <div><span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: tc.color, background: tc.bg }}>{a.type}</span></div>
                <div><span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: a.isActive ? "#10B981" : "#EF4444", background: a.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>{a.isActive ? "Active" : "Inactive"}</span></div>
                <div className="text-[11px]" style={{ color: "#8B95A7" }}>{fmt(a.startDate)} – {fmt(a.endDate)}</div>
                <div className="text-[12px]" style={{ color: a.isDismissible ? "#10B981" : "#8B95A7" }}>{a.isDismissible ? "Yes" : "No"}</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditId(editId === a.id ? null : a.id); setShowNew(false); }} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}><Edit2 size={12} /></button>
                  <button onClick={() => handleDelete(a.id)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#EF4444", background: "rgba(239,68,68,0.08)" }}><Trash2 size={12} /></button>
                </div>
              </div>
              {editId === a.id && (
                <div className="px-5 pb-4">
                  <AnnouncementForm initial={announcementToForm(a)} onSave={(form) => handleEdit(a.id, form)} onCancel={() => setEditId(null)} saving={saving} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
