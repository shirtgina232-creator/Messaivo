"use client";

import { useState } from "react";

type SiteContent = {
  id: string; loginHeading: string; loginDescription: string;
  signupHeading: string; signupDescription: string;
  dashboardHeading: string; dashboardDescription: string;
  supportText: string; supportEmail: string;
  footerText: string; copyrightText: string;
  updatedAt: Date; updatedBy: string | null;
};

const SECTIONS = [
  {
    title: "Login Page",
    fields: [
      { key: "loginHeading", label: "Heading", multiline: false },
      { key: "loginDescription", label: "Description", multiline: false },
    ],
  },
  {
    title: "Signup Page",
    fields: [
      { key: "signupHeading", label: "Heading", multiline: false },
      { key: "signupDescription", label: "Description", multiline: false },
    ],
  },
  {
    title: "Dashboard",
    fields: [
      { key: "dashboardHeading", label: "Heading", multiline: false },
      { key: "dashboardDescription", label: "Description", multiline: false },
    ],
  },
  {
    title: "Support",
    fields: [
      { key: "supportText", label: "Support Text", multiline: false },
      { key: "supportEmail", label: "Support Email", multiline: false },
    ],
  },
  {
    title: "Footer",
    fields: [
      { key: "footerText", label: "Footer Text", multiline: false },
      { key: "copyrightText", label: "Copyright Text", multiline: false },
    ],
  },
];

export default function ContentForm({ initial }: { initial: SiteContent }) {
  const [form, setForm] = useState<Record<string, string>>({
    loginHeading: initial.loginHeading, loginDescription: initial.loginDescription,
    signupHeading: initial.signupHeading, signupDescription: initial.signupDescription,
    dashboardHeading: initial.dashboardHeading, dashboardDescription: initial.dashboardDescription,
    supportText: initial.supportText, supportEmail: initial.supportEmail,
    footerText: initial.footerText, copyrightText: initial.copyrightText,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) setSaved(true);
      else { const d = await res.json(); setError(d.error ?? "Failed to save"); }
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => (
        <div key={section.title} className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{section.title}</h3>
          </div>
          <div className="p-5 grid md:grid-cols-2 gap-4">
            {section.fields.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>{label}</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                  style={{ background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span className="text-[12px]" style={{ color: "#10B981" }}>Saved!</span>}
        {error && <span className="text-[12px]" style={{ color: "#EF4444" }}>{error}</span>}
      </div>
    </div>
  );
}
