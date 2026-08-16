"use client";

import { useState } from "react";

type GlobalSettings = {
  id: string; appName: string; companyName: string; supportEmail: string;
  websiteUrl: string; timezone: string; senderName: string; senderEmail: string;
  maintenanceMode: boolean; signupEnabled: boolean; workspaceCreationEnabled: boolean;
  auditLogRetentionDays: number; updatedAt: Date; updatedBy: string | null;
};

export default function SettingsForm({ initial, readOnly }: { initial: GlobalSettings; readOnly: boolean }) {
  const [form, setForm] = useState({
    appName: initial.appName, companyName: initial.companyName, supportEmail: initial.supportEmail,
    websiteUrl: initial.websiteUrl, timezone: initial.timezone, senderName: initial.senderName,
    senderEmail: initial.senderEmail, maintenanceMode: initial.maintenanceMode,
    signupEnabled: initial.signupEnabled, workspaceCreationEnabled: initial.workspaceCreationEnabled,
    auditLogRetentionDays: initial.auditLogRetentionDays,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStr = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setBool = (k: string, v: boolean) => setForm((f) => ({ ...f, [k]: v }));
  const setNum = (k: string, v: number) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (readOnly) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) setSaved(true);
      else { const d = await res.json(); setError(d.error ?? "Failed to save"); }
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-[13px] outline-none";
  const inputStyle = { background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: readOnly ? "#8B95A7" : "#F5F7FA" };

  return (
    <div className="space-y-4">
      {/* General */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-5 py-3.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>General</h3>
        </div>
        <div className="p-5 grid md:grid-cols-2 gap-4">
          {[
            { key: "appName", label: "App Name" },
            { key: "companyName", label: "Company Name" },
            { key: "supportEmail", label: "Support Email" },
            { key: "websiteUrl", label: "Website URL" },
            { key: "timezone", label: "Default Timezone" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>{label}</label>
              <input type="text" className={inputClass} style={inputStyle} value={form[key as keyof typeof form] as string} readOnly={readOnly} onChange={(e) => setStr(key, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Email */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-5 py-3.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Email / Sending</h3>
        </div>
        <div className="p-5 grid md:grid-cols-2 gap-4">
          {[
            { key: "senderName", label: "Sender Name" },
            { key: "senderEmail", label: "Sender Email" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>{label}</label>
              <input type="text" className={inputClass} style={inputStyle} value={form[key as keyof typeof form] as string} readOnly={readOnly} onChange={(e) => setStr(key, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Platform toggles */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-5 py-3.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>Platform</h3>
        </div>
        <div className="p-5 space-y-4">
          {[
            { key: "maintenanceMode", label: "Maintenance Mode", desc: "Blocks all customer app access with a maintenance notice.", danger: true },
            { key: "signupEnabled", label: "Signup Enabled", desc: "Allow new users to create accounts.", danger: false },
            { key: "workspaceCreationEnabled", label: "Workspace Creation Enabled", desc: "Allow new workspaces to be created after signup.", danger: false },
          ].map(({ key, label, desc, danger }) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: danger && form[key as keyof typeof form] ? "#EF4444" : "#F5F7FA" }}>{label}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>{desc}</div>
              </div>
              <button
                onClick={() => !readOnly && setBool(key, !form[key as keyof typeof form])}
                disabled={readOnly}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: form[key as keyof typeof form] ? (danger ? "#EF4444" : "#6C63FF") : "rgba(255,255,255,0.12)", cursor: readOnly ? "default" : "pointer" }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ transform: form[key as keyof typeof form] ? "translateX(20px)" : "none" }}
                />
              </button>
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>Audit Log Retention (days)</label>
            <input type="number" className={inputClass} style={{ ...inputStyle, maxWidth: 200 }} value={form.auditLogRetentionDays} readOnly={readOnly} onChange={(e) => setNum("auditLogRetentionDays", Number(e.target.value))} />
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save Settings"}
          </button>
          {saved && <span className="text-[12px]" style={{ color: "#10B981" }}>Settings saved!</span>}
          {error && <span className="text-[12px]" style={{ color: "#EF4444" }}>{error}</span>}
        </div>
      )}
    </div>
  );
}
