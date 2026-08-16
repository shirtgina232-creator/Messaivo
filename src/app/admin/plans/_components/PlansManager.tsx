"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";

type Plan = {
  id: string; slug: string; name: string; description: string | null;
  monthlyPrice: number; yearlyPrice: number | null; monthlyCredits: number;
  features: string[]; isRecommended: boolean; displayOrder: number;
  isActive: boolean; premiumInbox: boolean; stripeProductId: string | null;
  createdAt: Date; updatedAt: Date;
};

const EMPTY_FORM = {
  name: "", description: "", monthlyPrice: 0, yearlyPrice: "",
  monthlyCredits: 0, features: "", isRecommended: false,
  displayOrder: 0, isActive: true, premiumInbox: false,
};

function PlanForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="p-5 rounded-xl mt-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { label: "Plan Name", key: "name", type: "text", placeholder: "e.g. Pro" },
          { label: "Description", key: "description", type: "text", placeholder: "Short description" },
          { label: "Monthly Price ($)", key: "monthlyPrice", type: "number", placeholder: "0" },
          { label: "Yearly Price ($)", key: "yearlyPrice", type: "number", placeholder: "Optional" },
          { label: "Monthly Credits", key: "monthlyCredits", type: "number", placeholder: "0" },
          { label: "Display Order", key: "displayOrder", type: "number", placeholder: "0" },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>{label}</label>
            <input
              type={type}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
              placeholder={placeholder}
              value={form[key as keyof typeof EMPTY_FORM] as string | number}
              onChange={(e) => set(key, type === "number" ? Number(e.target.value) : e.target.value)}
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7" }}>Features (one per line)</label>
          <textarea
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
            rows={4}
            placeholder="300,000 credits/month&#10;Priority inbox&#10;Email support"
            value={form.features}
            onChange={(e) => set("features", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-6">
          {[
            { key: "isRecommended", label: "Recommended" },
            { key: "premiumInbox", label: "Premium Inbox" },
            { key: "isActive", label: "Active" },
          ].map(({ key, label }) => (
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
          className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white transition-opacity"
          style={{ background: "#6C63FF", opacity: saving || !form.name ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save Plan"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[12.5px]" style={{ color: "#8B95A7" }}>Cancel</button>
      </div>
    </div>
  );
}

export default function PlansManager({ initialPlans, workspaceCountMap }: { initialPlans: Plan[]; workspaceCountMap: Record<string, number> }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function planToForm(p: Plan): typeof EMPTY_FORM {
    return {
      name: p.name, description: p.description ?? "", monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice?.toString() ?? "", monthlyCredits: p.monthlyCredits,
      features: p.features.join("\n"), isRecommended: p.isRecommended,
      displayOrder: p.displayOrder, isActive: p.isActive, premiumInbox: p.premiumInbox,
    };
  }

  async function handleCreate(form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
          yearlyPrice: form.yearlyPrice ? Number(form.yearlyPrice) : undefined,
        }),
      });
      if (res.ok) {
        const { plan } = await res.json();
        setPlans((prev) => [...prev, plan]);
        setShowNew(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string, form: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
          yearlyPrice: form.yearlyPrice ? Number(form.yearlyPrice) : undefined,
        }),
      });
      if (res.ok) {
        const { plan } = await res.json();
        setPlans((prev) => prev.map((p) => p.id === id ? plan : p));
        setEditId(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(plan: Plan) {
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    if (res.ok) {
      const { plan: updated } = await res.json();
      setPlans((prev) => prev.map((p) => p.id === plan.id ? updated : p));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this plan? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
    if (res.ok) setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "#8B95A7" }}>{plans.length} plan{plans.length !== 1 ? "s" : ""}</span>
        <button
          onClick={() => { setShowNew(true); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white"
          style={{ background: "#6C63FF" }}
        >
          <Plus size={14} /> New Plan
        </button>
      </div>

      {showNew && (
        <PlanForm
          initial={EMPTY_FORM}
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
          saving={saving}
        />
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="grid gap-3 px-5 py-3 border-b"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          {["Name / Slug", "Monthly Price", "Credits/mo", "Workspaces", "Active", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {plans.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No plans yet. Run the seed script or create one above.</div>
        )}
        {plans.map((plan) => (
          <div key={plan.id}>
            <div
              className="grid gap-3 px-5 py-4 border-b last:border-0 items-center"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{plan.name}</span>
                  {plan.isRecommended && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(108,99,255,0.15)", color: "#8B85FF" }}>RECOMMENDED</span>
                  )}
                  {plan.premiumInbox && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(251,146,60,0.15)", color: "#FB923C" }}>PREMIUM INBOX</span>
                  )}
                </div>
                <div className="text-[11px] font-mono" style={{ color: "#8B95A7" }}>{plan.slug}</div>
              </div>
              <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>
                ${plan.monthlyPrice}<span className="text-[11px] font-normal" style={{ color: "#8B95A7" }}>/mo</span>
              </div>
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>
                {plan.monthlyCredits.toLocaleString()}
              </div>
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>
                {workspaceCountMap[plan.slug] ?? 0}
              </div>
              <div>
                {plan.isActive ? (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: "#10B981" }}><Check size={12} /> Active</span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: "#EF4444" }}><X size={12} /> Inactive</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditId(editId === plan.id ? null : plan.id); setShowNew(false); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                  title="Edit"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => handleToggleActive(plan)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: plan.isActive ? "#EF4444" : "#10B981", background: "rgba(255,255,255,0.04)" }}
                  title={plan.isActive ? "Deactivate" : "Activate"}
                >
                  {plan.isActive ? <X size={12} /> : <Check size={12} />}
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: "#EF4444", background: "rgba(239,68,68,0.08)" }}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {editId === plan.id && (
              <div className="px-5 pb-4">
                <PlanForm
                  initial={planToForm(plan)}
                  onSave={(form) => handleEdit(plan.id, form)}
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
