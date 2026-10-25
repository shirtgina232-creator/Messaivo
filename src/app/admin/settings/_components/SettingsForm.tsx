"use client";

import { useState } from "react";

// ── SMTP Section ──────────────────────────────────────────────────────────────

type SmtpForm = {
  host: string; port: string; secure: boolean;
  username: string; password: string;
  fromName: string; fromEmail: string;
};

function SmtpSection({ readOnly }: { readOnly: boolean }) {
  const [form, setForm] = useState<SmtpForm>({ host: "", port: "587", secure: false, username: "", password: "", fromName: "", fromEmail: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [smtpError, setSmtpError] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useState(() => {
    fetch("/api/admin/smtp")
      .then(r => r.ok ? r.json() : null)
      .then((d: { smtp?: { host: string; port: number; secure: boolean; username: string; fromName: string; fromEmail: string; hasPassword: boolean } | null } | null) => {
        if (d?.smtp) {
          setForm(f => ({
            ...f,
            host: d.smtp!.host, port: String(d.smtp!.port), secure: d.smtp!.secure,
            username: d.smtp!.username, fromName: d.smtp!.fromName, fromEmail: d.smtp!.fromEmail,
            password: d.smtp!.hasPassword ? "••••••••" : "",
          }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  });

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true); setSmtpError(null); setSaved(false);
    const payload: Record<string, unknown> = { host: form.host, port: Number(form.port), secure: form.secure, username: form.username, fromName: form.fromName, fromEmail: form.fromEmail };
    if (form.password && form.password !== "••••••••") payload.password = form.password;
    try {
      const res = await fetch("/api/admin/smtp", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) setSaved(true);
      else { const d = await res.json() as { error?: string }; setSmtpError(d.error ?? "Save failed"); }
    } catch { setSmtpError("Network error"); } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch("/api/admin/smtp/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: testTo }) });
      const d = await res.json() as { ok: boolean; error?: string };
      setTestResult(d);
    } catch { setTestResult({ ok: false, error: "Network error" }); } finally { setTesting(false); }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-[13px] outline-none";
  const inputStyle = { background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: readOnly ? "#8B95A7" : "#F5F7FA" };

  return (
    <>
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>SMTP / Transactional Email</h3>
          {!readOnly && (
            <button onClick={() => { setTestOpen(true); setTestResult(null); }} className="text-[11.5px] font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.2)" }}>
              Send test email
            </button>
          )}
        </div>
        <div className="p-5">
          {!loaded ? (
            <div className="text-[12px]" style={{ color: "#8B95A7" }}>Loading…</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>SMTP Host</label>
                <input type="text" className={inputClass} style={inputStyle} placeholder="smtp.example.com" value={form.host} readOnly={readOnly} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>Port</label>
                <input type="number" className={inputClass} style={{ ...inputStyle, maxWidth: 120 }} value={form.port} readOnly={readOnly} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>Username</label>
                <input type="text" className={inputClass} style={inputStyle} autoComplete="off" value={form.username} readOnly={readOnly} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>Password</label>
                <input type="password" className={inputClass} style={inputStyle} autoComplete="new-password" placeholder={form.password === "••••••••" ? "Leave blank to keep current" : ""} value={form.password === "••••••••" ? "" : form.password} readOnly={readOnly} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>From Name</label>
                <input type="text" className={inputClass} style={inputStyle} value={form.fromName} readOnly={readOnly} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>From Email</label>
                <input type="email" className={inputClass} style={inputStyle} value={form.fromEmail} readOnly={readOnly} onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.secure} disabled={readOnly} onChange={e => setForm(f => ({ ...f, secure: e.target.checked }))} className="w-4 h-4 rounded accent-[#6C63FF]" />
                  <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>Use SSL/TLS (port 465)</span>
                </label>
              </div>
            </div>
          )}
          {!readOnly && loaded && (
            <div className="flex items-center gap-3 mt-4">
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Save SMTP"}
              </button>
              {saved && <span className="text-[12px]" style={{ color: "#10B981" }}>SMTP settings saved!</span>}
              {smtpError && <span className="text-[12px]" style={{ color: "#EF4444" }}>{smtpError}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Test Email Modal */}
      {testOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setTestOpen(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Send Test Email</h2>
            <p className="text-[12.5px] mb-4" style={{ color: "#8B95A7" }}>Verify SMTP is configured correctly.</p>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7" }}>Recipient Email</label>
            <input type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="you@example.com" className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none mb-3" style={{ background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }} />
            {testResult && (
              <p className="text-[12px] mb-3" style={{ color: testResult.ok ? "#10B981" : "#EF4444" }}>
                {testResult.ok ? "Test email sent successfully!" : (testResult.error ?? "Failed to send.")}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={handleTest} disabled={testing || !testTo.includes("@")} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: testing ? "rgba(108,99,255,0.6)" : "#6C63FF" }}>
                {testing ? "Sending…" : "Send"}
              </button>
              <button onClick={() => setTestOpen(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Global Settings ───────────────────────────────────────────────────────────

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

      <SmtpSection readOnly={readOnly} />

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
