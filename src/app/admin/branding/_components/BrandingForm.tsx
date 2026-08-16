"use client";

import { useState } from "react";

type Branding = {
  id: string; brandName: string; logoUrl: string | null; faviconUrl: string | null;
  loginLogoUrl: string | null; dashboardLogoUrl: string | null; browserTitle: string;
  supportEmail: string; companyName: string; updatedAt: Date; updatedBy: string | null;
};

const DEFAULTS = {
  brandName: "Messaivo", logoUrl: "", faviconUrl: "", loginLogoUrl: "",
  dashboardLogoUrl: "", browserTitle: "Messaivo", supportEmail: "", companyName: "Messaivo",
};

const FIELDS = [
  { key: "brandName", label: "Brand Name", placeholder: "Messaivo" },
  { key: "companyName", label: "Company Name", placeholder: "Messaivo" },
  { key: "browserTitle", label: "Browser Tab Title", placeholder: "Messaivo" },
  { key: "supportEmail", label: "Support Email", placeholder: "support@messaivo.com" },
  { key: "logoUrl", label: "Logo URL", placeholder: "https://..." },
  { key: "faviconUrl", label: "Favicon URL", placeholder: "https://..." },
  { key: "loginLogoUrl", label: "Login Page Logo URL", placeholder: "https://..." },
  { key: "dashboardLogoUrl", label: "Dashboard Logo URL", placeholder: "https://..." },
];

export default function BrandingForm({ initial }: { initial: Branding }) {
  const [form, setForm] = useState({
    brandName: initial.brandName,
    companyName: initial.companyName,
    browserTitle: initial.browserTitle,
    supportEmail: initial.supportEmail,
    logoUrl: initial.logoUrl ?? "",
    faviconUrl: initial.faviconUrl ?? "",
    loginLogoUrl: initial.loginLogoUrl ?? "",
    dashboardLogoUrl: initial.dashboardLogoUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) setSaved(true);
      else { const d = await res.json(); setError(d.error ?? "Failed to save"); }
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  function handleReset() {
    if (!confirm("Reset all branding to defaults?")) return;
    setForm(DEFAULTS);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <h2 className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>Site Branding</h2>
      </div>
      <div className="p-6 grid md:grid-cols-2 gap-5">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>{label}</label>
            <input
              type="text"
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
              style={{ background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="px-6 py-4 border-t flex items-center gap-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-lg text-[12.5px] font-semibold text-white"
          style={{ background: "#6C63FF", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button onClick={handleReset} className="px-4 py-2 rounded-lg text-[12.5px]" style={{ color: "#8B95A7" }}>
          Reset to Default
        </button>
        {saved && <span className="text-[12px]" style={{ color: "#10B981" }}>Saved!</span>}
        {error && <span className="text-[12px]" style={{ color: "#EF4444" }}>{error}</span>}
      </div>
    </div>
  );
}
