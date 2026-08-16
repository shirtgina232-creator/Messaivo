"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";

type Offer = {
  id: string; name: string; description: string | null;
  discountPercent: number | null; discountFixed: number | null;
  couponCode: string | null; applicablePlanSlugs: string[];
  startDate: Date | null; endDate: Date | null;
  isActive: boolean; isAutomatic: boolean; createdAt: Date; updatedAt: Date;
};

const EMPTY_FORM = {
  name: "", description: "", discountType: "percent", discountPercent: "", discountFixed: "",
  couponCode: "", applicablePlanSlugs: "", startDate: "", endDate: "",
  isActive: true, isAutomatic: false,
};

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
}

function OfferForm({ initial, onSave, onCancel, saving }: {
  initial: typeof EMPTY_FORM; onSave: (d: typeof EMPTY_FORM) => void; onCancel: () => void; saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="p-5 rounded-xl mt-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { label: "Offer Name", key: "name", type: "text" },
          { label: "Description", key: "description", type: "text" },
          { label: "Coupon Code", key: "couponCode", type: "text" },
          { label: "Applicable Plans (comma-separated slugs)", key: "applicablePlanSlugs", type: "text" },
          { label: "Start Date", key: "startDate", type: "date" },
          { label: "End Date", key: "endDate", type: "date" },
        ].map(({ label, key, type }) => (
          <div key={key}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>{label}</label>
            <input
              type={type}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
              value={form[key as keyof typeof EMPTY_FORM] as string}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        ))}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Discount Type</label>
          <select
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
            value={form.discountType}
            onChange={(e) => set("discountType", e.target.value)}
          >
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>
            {form.discountType === "percent" ? "Discount %" : "Discount $"}
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
            value={form.discountType === "percent" ? form.discountPercent : form.discountFixed}
            onChange={(e) => set(form.discountType === "percent" ? "discountPercent" : "discountFixed", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-6">
          {[{ key: "isActive", label: "Active" }, { key: "isAutomatic", label: "Automatic" }].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={Boolean(form[key as keyof typeof EMPTY_FORM])} onChange={(e) => set(key, e.target.checked)} />
              <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name}
          className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white"
          style={{ background: "#6C63FF", opacity: saving || !form.name ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save Offer"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[12.5px]" style={{ color: "#8B95A7" }}>Cancel</button>
      </div>
    </div>
  );
}

function formToPayload(form: typeof EMPTY_FORM) {
  return {
    name: form.name, description: form.description || undefined,
    discountPercent: form.discountType === "percent" && form.discountPercent ? Number(form.discountPercent) : undefined,
    discountFixed: form.discountType === "fixed" && form.discountFixed ? Number(form.discountFixed) : undefined,
    couponCode: form.couponCode || undefined,
    applicablePlanSlugs: form.applicablePlanSlugs ? form.applicablePlanSlugs.split(",").map((s) => s.trim()).filter(Boolean) : [],
    startDate: form.startDate || undefined, endDate: form.endDate || undefined,
    isActive: form.isActive, isAutomatic: form.isAutomatic,
  };
}

function offerToForm(o: Offer): typeof EMPTY_FORM {
  return {
    name: o.name, description: o.description ?? "",
    discountType: o.discountPercent !== null ? "percent" : "fixed",
    discountPercent: o.discountPercent?.toString() ?? "",
    discountFixed: o.discountFixed?.toString() ?? "",
    couponCode: o.couponCode ?? "",
    applicablePlanSlugs: o.applicablePlanSlugs.join(", "),
    startDate: o.startDate ? new Date(o.startDate).toISOString().split("T")[0] : "",
    endDate: o.endDate ? new Date(o.endDate).toISOString().split("T")[0] : "",
    isActive: o.isActive, isAutomatic: o.isAutomatic,
  };
}

export default function OffersManager({ initialOffers }: { initialOffers: Offer[] }) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formToPayload(form)) });
      if (res.ok) { const { offer } = await res.json(); setOffers((p) => [offer, ...p]); setShowNew(false); }
    } finally { setSaving(false); }
  }

  async function handleEdit(id: string, form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/offers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formToPayload(form)) });
      if (res.ok) { const { offer } = await res.json(); setOffers((p) => p.map((o) => o.id === id ? offer : o)); setEditId(null); }
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this offer?")) return;
    const res = await fetch(`/api/admin/offers/${id}`, { method: "DELETE" });
    if (res.ok) setOffers((p) => p.filter((o) => o.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "#8B95A7" }}>{offers.length} offer{offers.length !== 1 ? "s" : ""}</span>
        <button onClick={() => { setShowNew(true); setEditId(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF" }}>
          <Plus size={14} /> New Offer
        </button>
      </div>
      {showNew && <OfferForm initial={EMPTY_FORM} onSave={handleCreate} onCancel={() => setShowNew(false)} saving={saving} />}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="grid gap-3 px-5 py-3 border-b" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          {["Name", "Discount", "Coupon Code", "Status", "Dates", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {offers.length === 0 && <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No offers yet.</div>}
        {offers.map((o) => (
          <div key={o.id}>
            <div className="grid gap-3 px-5 py-4 border-b last:border-0 items-center" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.05)" }}>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{o.name}</div>
                {o.isAutomatic && <span className="text-[10px]" style={{ color: "#8B95A7" }}>Automatic</span>}
              </div>
              <div className="text-[12.5px]" style={{ color: "#F5F7FA" }}>
                {o.discountPercent !== null ? `${o.discountPercent}%` : o.discountFixed !== null ? `$${o.discountFixed}` : "—"}
              </div>
              <div className="flex items-center gap-1.5">
                {o.couponCode ? (
                  <span className="flex items-center gap-1 text-[12px] px-2 py-0.5 rounded font-mono" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>
                    <Tag size={10} /> {o.couponCode}
                  </span>
                ) : <span style={{ color: "#8B95A7" }}>—</span>}
              </div>
              <div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ color: o.isActive ? "#10B981" : "#EF4444", background: o.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
                  {o.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-[11px]" style={{ color: "#8B95A7" }}>{fmt(o.startDate)} – {fmt(o.endDate)}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditId(editId === o.id ? null : o.id); setShowNew(false); }} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}><Edit2 size={12} /></button>
                <button onClick={() => handleDelete(o.id)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#EF4444", background: "rgba(239,68,68,0.08)" }}><Trash2 size={12} /></button>
              </div>
            </div>
            {editId === o.id && (
              <div className="px-5 pb-4">
                <OfferForm initial={offerToForm(o)} onSave={(form) => handleEdit(o.id, form)} onCancel={() => setEditId(null)} saving={saving} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
