"use client";

import { useState } from "react";

interface ThemeData {
  brandName:          string;
  logoUrl:            string | null;
  primaryColor:       string;
  secondaryColor:     string;
  accentColor:        string;
  backgroundColor:    string;
  surfaceColor:       string;
  borderColor:        string;
  textColor:          string;
  mutedTextColor:     string;
  fontFamily:         string;
  buttonStyle:        string;
  borderRadius:       string;
  landingHeading:     string;
  landingDescription: string;
  ctaText:            string;
  announcementText:   string | null;
  footerContent:      string | null;
}

const COLOR_FIELDS: { key: keyof ThemeData; label: string }[] = [
  { key: "primaryColor",    label: "Primary" },
  { key: "secondaryColor",  label: "Secondary" },
  { key: "accentColor",     label: "Accent" },
  { key: "backgroundColor", label: "Background" },
  { key: "surfaceColor",    label: "Surface / Card" },
  { key: "textColor",       label: "Text" },
  { key: "mutedTextColor",  label: "Muted Text" },
  { key: "borderColor",     label: "Border" },
];

const FONT_OPTIONS = ["Geist", "Inter", "DM Sans", "Plus Jakarta Sans", "Manrope", "Poppins"];

const BUTTON_STYLES = [
  { value: "rounded", label: "Rounded" },
  { value: "pill",    label: "Pill" },
  { value: "square",  label: "Square" },
];

function getBtnRadius(buttonStyle: string, borderRadius: string): string {
  if (buttonStyle === "pill")   return "9999px";
  if (buttonStyle === "square") return "4px";
  return `${borderRadius}px`;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isHex = /^#[0-9a-fA-F]{3,8}$/.test(value);
  return (
    <div>
      <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        {isHex && (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0.5 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg text-[11.5px] outline-none font-mono"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
        />
      </div>
    </div>
  );
}

function LivePreview({ form }: { form: ThemeData }) {
  const btnRadius = getBtnRadius(form.buttonStyle, form.borderRadius);
  const br = `${form.borderRadius}px`;

  return (
    <div
      className="rounded-xl overflow-hidden flex-shrink-0"
      style={{
        width: 340,
        border: "1px solid rgba(255,255,255,0.08)",
        background: form.surfaceColor,
      }}
    >
      {/* Preview header */}
      <div
        className="px-4 py-2.5 border-b flex items-center gap-2"
        style={{ borderColor: form.borderColor, background: form.backgroundColor }}
      >
        {form.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.logoUrl} alt="logo" className="h-5 object-contain" />
        ) : (
          <span className="text-[13px] font-bold" style={{ color: form.primaryColor }}>
            {form.brandName || "Brand"}
          </span>
        )}
      </div>

      {/* Hero */}
      <div
        className="px-5 py-6"
        style={{ background: form.backgroundColor }}
      >
        {form.announcementText && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium mb-4"
            style={{
              background: `${form.primaryColor}18`,
              color: form.primaryColor,
              border: `1px solid ${form.primaryColor}30`,
            }}
          >
            {form.announcementText}
          </div>
        )}
        <h1
          className="text-[18px] font-bold leading-snug mb-2"
          style={{ color: form.textColor, fontFamily: form.fontFamily }}
        >
          {form.landingHeading || "Heading"}
        </h1>
        <p className="text-[11.5px] leading-relaxed mb-5" style={{ color: form.mutedTextColor }}>
          {form.landingDescription
            ? form.landingDescription.slice(0, 120) + (form.landingDescription.length > 120 ? "…" : "")
            : "Description"}
        </p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 text-[12px] font-semibold"
            style={{
              background: form.primaryColor,
              color: "#fff",
              borderRadius: btnRadius,
            }}
          >
            {form.ctaText || "Get started"}
          </button>
          <button
            className="px-4 py-2 text-[12px] font-semibold"
            style={{
              background: "transparent",
              color: form.textColor,
              border: `1px solid ${form.borderColor}`,
              borderRadius: btnRadius,
            }}
          >
            Learn more
          </button>
        </div>
      </div>

      {/* Mock feature cards */}
      <div
        className="grid grid-cols-2 gap-2 px-4 pb-5"
        style={{ background: form.backgroundColor }}
      >
        {["Messenger", "Broadcasts", "Contacts", "Analytics"].map((label) => (
          <div
            key={label}
            className="p-3 rounded-lg"
            style={{
              background: form.surfaceColor,
              border: `1px solid ${form.borderColor}`,
              borderRadius: br,
            }}
          >
            <div className="w-5 h-5 rounded mb-2" style={{ background: form.primaryColor + "30" }} />
            <div className="text-[11px] font-medium" style={{ color: form.textColor }}>
              {label}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: form.mutedTextColor }}>
              Sample feature
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {form.footerContent && (
        <div
          className="px-4 py-2.5 text-[10px] border-t"
          style={{ borderColor: form.borderColor, color: form.mutedTextColor, background: form.surfaceColor }}
        >
          {form.footerContent.slice(0, 80)}
        </div>
      )}

      <div className="px-4 py-2 text-[9px] text-center" style={{ color: form.mutedTextColor }}>
        Live Preview
      </div>
    </div>
  );
}

export default function ThemeForm({
  initial,
  defaults,
}: {
  initial: ThemeData;
  defaults: ThemeData;
}) {
  const [form, setForm] = useState<ThemeData>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(false);

  const set = <K extends keyof ThemeData>(key: K, value: ThemeData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetToDefaults = () => setForm(defaults);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg("Theme saved successfully.");
        setMsgOk(true);
        setTimeout(() => setMsg(""), 3000);
      } else {
        const d = (await res.json()) as { error?: string };
        setMsg(d.error ?? "Save failed.");
        setMsgOk(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#F5F7FA",
  } as React.CSSProperties;

  return (
    <div className="flex gap-6 items-start">
      {/* Form column */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Brand */}
        <div
          className="p-5 rounded-xl"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: "#F5F7FA" }}>
            Brand
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
                Brand Name
              </label>
              <input
                type="text"
                value={form.brandName}
                onChange={(e) => set("brandName", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={inputStyle}
                placeholder="Messaivo"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
                Logo URL <span style={{ color: "#8B95A7", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="url"
                value={form.logoUrl ?? ""}
                onChange={(e) => set("logoUrl", e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={inputStyle}
                placeholder="https://…"
              />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div
          className="p-5 rounded-xl"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: "#F5F7FA" }}>
            Colors
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {COLOR_FIELDS.map(({ key, label }) => (
              <ColorField
                key={key}
                label={label}
                value={(form[key] as string) ?? ""}
                onChange={(v) => set(key, v)}
              />
            ))}
          </div>
        </div>

        {/* Typography & Style */}
        <div
          className="p-5 rounded-xl"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: "#F5F7FA" }}>
            Typography & Shape
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
                Font Family
              </label>
              <select
                value={form.fontFamily}
                onChange={(e) => set("fontFamily", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={inputStyle}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
                Button Style
              </label>
              <select
                value={form.buttonStyle}
                onChange={(e) => set("buttonStyle", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={inputStyle}
              >
                {BUTTON_STYLES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
                Border Radius (px)
              </label>
              <input
                type="number"
                min="0"
                max="32"
                value={form.borderRadius}
                onChange={(e) => set("borderRadius", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className="p-5 rounded-xl"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: "#F5F7FA" }}>
            Content
          </h2>
          <div className="flex flex-col gap-4">
            {[
              { key: "landingHeading",     label: "Landing Heading",     multiline: false },
              { key: "landingDescription", label: "Landing Description", multiline: true  },
              { key: "ctaText",            label: "CTA Button Text",     multiline: false },
              { key: "announcementText",   label: "Announcement Banner", multiline: false },
              { key: "footerContent",      label: "Footer Content",      multiline: true  },
            ].map(({ key, label, multiline }) => (
              <div key={key}>
                <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
                  {label}
                </label>
                {multiline ? (
                  <textarea
                    rows={3}
                    value={(form[key as keyof ThemeData] as string | null) ?? ""}
                    onChange={(e) => set(key as keyof ThemeData, e.target.value || null as never)}
                    className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-y"
                    style={inputStyle}
                  />
                ) : (
                  <input
                    type="text"
                    value={(form[key as keyof ThemeData] as string | null) ?? ""}
                    onChange={(e) => set(key as keyof ThemeData, e.target.value || null as never)}
                    className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all"
            style={{ background: saving ? "rgba(108,99,255,0.5)" : "#6C63FF" }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={resetToDefaults}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#8B95A7",
            }}
          >
            Reset to Default
          </button>
          {msg && (
            <span className="text-[12.5px]" style={{ color: msgOk ? "#10B981" : "#EF4444" }}>
              {msg}
            </span>
          )}
        </div>
      </div>

      {/* Live preview column */}
      <div className="hidden lg:block">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>
          Live Preview
        </div>
        <LivePreview form={form} />
      </div>
    </div>
  );
}
