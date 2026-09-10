"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, ChevronRight, Check, Search, Loader2, AlertCircle, AlertTriangle,
  FileText, Users, MessageSquare, ShieldCheck, Send, Calendar,
  Clock, ChevronLeft, Info, Eye, UserCheck,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FieldType = "TEXT" | "NUMBER" | "URL" | "DATE" | "CURRENCY" | "TEXTAREA" | "DROPDOWN";

interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  maxLength?: number;
  placeholder?: string;
  options?: string[];
}

interface AvailableTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  fields: TemplateField[] | null;
  category: string | null;
  source: "global" | "workspace";
}

interface ContactItem {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  metaUserId: string;
  pageId: string;
  lastMessageAt: string | null;
}

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  _count: { members: number };
}

interface EligibilityResult {
  total: number;
  // Granular breakdown
  windowOpen: number;         // Subscribed + inbound msg within 24 h → eligible for RESPONSE
  windowClosed: number;       // Subscribed + inbound msg but >24 h ago → CANNOT send
  neverMessaged: number;      // Subscribed + no inbound msg on record → CANNOT send
  unsubscribed: number;       // Opted out → CANNOT send
  eligibleForMethod: number;  // Can receive this message right now (= windowOpen for RESPONSE)
  cannotSend: number;         // Everyone else
  // Legacy aliases (kept for backwards compat with older send routes)
  eligible: number;
  ineligible: number;
  skipped: number;
}

type RecipientMode = "all" | "contacts" | "groups";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CONTACT_VARS = new Set(["first_name", "last_name", "name", "page_name"]);
const CONTACT_VAR_SAMPLES: Record<string, string> = {
  first_name: "Alex", last_name: "Johnson", name: "Alex Johnson", page_name: "Your Page",
};

const STEPS = [
  { id: 1, label: "Template",    icon: FileText },
  { id: 2, label: "Recipients",  icon: Users },
  { id: 3, label: "Variables",   icon: MessageSquare },
  { id: 4, label: "Preview",     icon: Eye },
  { id: 5, label: "Compliance",  icon: ShieldCheck },
  { id: 6, label: "Send",        icon: Send },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function displayName(c: ContactItem) {
  if (c.name) return c.name;
  const p = [c.firstName, c.lastName].filter(Boolean);
  return p.length ? p.join(" ") : c.metaUserId.slice(0, 12) + "…";
}

function windowStatus(c: ContactItem): "open" | "closed" | "never" {
  if (!c.lastMessageAt) return "never";
  return new Date(c.lastMessageAt).getTime() > Date.now() - 86_400_000 ? "open" : "closed";
}

function renderPreview(content: string, values: Record<string, string>, pageName?: string): string {
  const samples: Record<string, string> = { ...CONTACT_VAR_SAMPLES, ...(pageName ? { page_name: pageName } : {}), ...values };
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => samples[k] ?? `{{${k}}}`);
}

function extractVars(content: string): string[] {
  const seen = new Set<string>();
  for (const [, k] of content.matchAll(/\{\{(\w+)\}\}/g)) seen.add(k);
  return [...seen];
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared input style
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_STYLE = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#F5F7FA",
} as const;

function FieldInput({ field, value, onChange }: {
  field: TemplateField; value: string; onChange: (v: string) => void;
}) {
  const base = "w-full px-3 py-2.5 rounded-lg text-[13px] outline-none";
  if (field.type === "TEXTAREA")
    return <textarea rows={3} className={`${base} resize-none`} style={FIELD_STYLE} placeholder={field.placeholder ?? ""} maxLength={field.maxLength} value={value} onChange={e => onChange(e.target.value)} />;
  if (field.type === "DROPDOWN" && field.options?.length)
    return (
      <select className={base} style={FIELD_STYLE} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.options.map(o => <option key={o}>{o}</option>)}
      </select>
    );
  const t = field.type === "DATE" ? "date" : (field.type === "NUMBER" || field.type === "CURRENCY") ? "text" : field.type === "URL" ? "url" : "text";
  return <input type={t} className={base} style={FIELD_STYLE} placeholder={field.placeholder ?? (field.type === "URL" ? "https://" : "")} maxLength={field.maxLength} value={value} onChange={e => onChange(e.target.value)} />;
}

function validateField(type: FieldType, v: string): string | null {
  if (!v.trim()) return null;
  if (type === "URL") { try { new URL(v); return null; } catch { return "Must be a valid URL starting with https://"; } }
  if (type === "DATE") { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Format: YYYY-MM-DD"; return null; }
  if (type === "NUMBER" || type === "CURRENCY") { if (isNaN(Number(v))) return "Must be a number"; return null; }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Select Template
// ─────────────────────────────────────────────────────────────────────────────

function StepTemplate({ broadcastName, onNameChange, pageId, onPageChange, template, onSelect }: {
  broadcastName: string; onNameChange: (v: string) => void;
  pageId: string; onPageChange: (v: string) => void;
  template: AvailableTemplate | null; onSelect: (t: AvailableTemplate) => void;
}) {
  const { pages } = useWorkspace();
  const [templates, setTemplates] = useState<AvailableTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    fetch(`/api/broadcast-templates?${p}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { templates?: AvailableTemplate[] } | null) => { if (d?.templates) setTemplates(d.templates); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  const cats = ["all", ...Array.from(new Set(templates.map(t => t.category).filter(Boolean))) as string[]];
  const filtered = catFilter === "all" ? templates : templates.filter(t => t.category === catFilter);

  return (
    <div className="flex flex-col gap-6">
      {/* Message name */}
      <div>
        <label className="text-[10.5px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: "#8B95A7" }}>Message Name</label>
        <input value={broadcastName} onChange={e => onNameChange(e.target.value)}
          placeholder="e.g. September Appointment Reminders"
          className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={FIELD_STYLE} />
        <p className="text-[11px] mt-1" style={{ color: "#8B95A7" }}>For internal reference — not visible to recipients.</p>
      </div>

      {/* Channel */}
      {pages.length > 1 && (
        <div>
          <label className="text-[10.5px] font-semibold uppercase tracking-widest block mb-2" style={{ color: "#8B95A7" }}>Delivery Channel</label>
          <div className="flex flex-col gap-2">
            {pages.map(p => (
              <button key={p.id} onClick={() => onPageChange(p.id)}
                className="flex items-center gap-3 p-3 rounded-xl text-left"
                style={{ background: pageId === p.id ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${pageId === p.id ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: p.color }}>{p.avatar}</div>
                <span className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{p.name}</span>
                {pageId === p.id && <Check size={13} className="ml-auto" style={{ color: "#6C63FF" }} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#8B95A7" }}>Select Template</label>
          <div className="flex items-start gap-1.5">
            <Info size={11} style={{ color: "#8B95A7", marginTop: 1 }} />
            <span className="text-[11px]" style={{ color: "#8B95A7" }}>Only internally approved templates are shown</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
              className="w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none" style={FIELD_STYLE} />
          </div>
          {cats.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              {cats.slice(0, 5).map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium capitalize"
                  style={{ background: catFilter === cat ? "rgba(108,99,255,0.12)" : "transparent", color: catFilter === cat ? "#8B85FF" : "#8B95A7", border: `1px solid ${catFilter === cat ? "rgba(108,99,255,0.25)" : "transparent"}` }}>
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-3">
            <FileText size={30} style={{ color: "#8B95A7", opacity: 0.2 }} />
            <p className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>No templates available</p>
            <p className="text-[12px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
              {search ? "Try a different search term." : "No approved templates found. Ask your administrator to create and approve templates in the Template Library."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(t => {
              const isSelected = template?.id === t.id;
              return (
                <button key={t.id} onClick={() => onSelect(t)}
                  className="flex flex-col p-4 rounded-xl text-left"
                  style={{ background: isSelected ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isSelected ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.07)"}` }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold leading-tight" style={{ color: isSelected ? "#A89DFF" : "#F5F7FA" }}>{t.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {t.category && <span className="text-[9.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>{t.category}</span>}
                        {t.source === "workspace" && <span className="text-[9.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>Custom</span>}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#6C63FF" }}>
                        <Check size={10} color="#fff" />
                      </div>
                    )}
                  </div>
                  {t.description && <p className="text-[11.5px] mb-2 leading-relaxed" style={{ color: "#8B95A7" }}>{t.description}</p>}
                  <div className="text-[11px] p-2 rounded-lg whitespace-pre-wrap line-clamp-2 mt-auto"
                    style={{ background: "rgba(255,255,255,0.02)", color: "rgba(139,149,167,0.8)", fontFamily: "inherit" }}>
                    {t.content.slice(0, 100)}{t.content.length > 100 ? "…" : ""}
                  </div>
                  {t.fields && t.fields.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {extractVars(t.content).filter(v => !CONTACT_VARS.has(v)).slice(0, 3).map(v => (
                        <span key={v} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>{`{{${v}}}`}</span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Messaging Status / Compliance Summary Panel
// ─────────────────────────────────────────────────────────────────────────────

function MessagingStatusPanel({ eligibility, eligibilityLoading, emptyReason, compact }: {
  eligibility: EligibilityResult | null;
  eligibilityLoading: boolean;
  emptyReason?: string;
  compact?: boolean;
}) {
  if (eligibilityLoading) {
    return (
      <div className="flex items-center gap-2.5 p-4 rounded-xl text-[12.5px]"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#8B95A7" }}>
        <Loader2 size={13} className="animate-spin" /> Checking messaging status…
      </div>
    );
  }

  if (!eligibility) {
    return (
      <div className="p-4 rounded-xl text-[12.5px]"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#8B95A7" }}>
        {emptyReason ?? "Select recipients to see messaging status."}
      </div>
    );
  }

  const { total, windowOpen, windowClosed, neverMessaged, unsubscribed, eligibleForMethod, cannotSend } = eligibility;

  // Per-row config
  type RowDef = { label: string; value: number; color: string; bg: string; border: string; note: string };
  const rows: RowDef[] = [
    {
      label: "Total Selected Contacts",
      value: total,
      color: "#F5F7FA",
      bg: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.07)",
      note: "All contacts in this audience selection.",
    },
    {
      label: "Contacts Available for Standard Messaging",
      value: windowOpen,
      color: "#10B981",
      bg: "rgba(16,185,129,0.05)",
      border: "rgba(16,185,129,0.15)",
      note: "These contacts sent a message to your Page within the last 24 hours, opening the standard Messenger response window (messaging_type: RESPONSE).",
    },
    {
      label: "Contacts Outside Standard Messaging Window",
      value: windowClosed + neverMessaged,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.05)",
      border: "rgba(245,158,11,0.15)",
      note: windowClosed > 0 && neverMessaged > 0
        ? `${windowClosed.toLocaleString()} had an active window that has since expired. ${neverMessaged.toLocaleString()} have never sent a message to this Page.`
        : windowClosed > 0
        ? `${windowClosed.toLocaleString()} had a previous conversation, but the 24-hour window has closed.`
        : `${neverMessaged.toLocaleString()} have never sent a message to this Page — no messaging window has ever been opened.`,
    },
    {
      label: "Contacts Eligible for the Selected Messaging Method",
      value: eligibleForMethod,
      color: eligibleForMethod > 0 ? "#8B85FF" : "#EF4444",
      bg: eligibleForMethod > 0 ? "rgba(108,99,255,0.06)" : "rgba(239,68,68,0.05)",
      border: eligibleForMethod > 0 ? "rgba(108,99,255,0.2)" : "rgba(239,68,68,0.15)",
      note: eligibleForMethod > 0
        ? `${eligibleForMethod.toLocaleString()} contact${eligibleForMethod !== 1 ? "s are" : " is"} eligible to receive this message now. Messaging method: RESPONSE (24-hour window). 1 credit is charged per successfully delivered message.`
        : "No contacts are currently eligible. The selected messaging method (RESPONSE) requires recipients to have sent a message to your Page within the last 24 hours. No alternative sending method is available in this application.",
    },
    {
      label: "Contacts That Cannot Be Sent To",
      value: cannotSend,
      color: cannotSend > 0 ? "#EF4444" : "#10B981",
      bg: cannotSend > 0 ? "rgba(239,68,68,0.04)" : "rgba(16,185,129,0.04)",
      border: cannotSend > 0 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.1)",
      note: cannotSend === 0
        ? "All selected contacts can receive this message."
        : [
            windowClosed > 0 ? `${windowClosed.toLocaleString()} window expired` : "",
            neverMessaged > 0 ? `${neverMessaged.toLocaleString()} never messaged page` : "",
            unsubscribed > 0 ? `${unsubscribed.toLocaleString()} opted out` : "",
          ].filter(Boolean).join(" · ") + ". These contacts will be skipped at send time. No credits are charged for skipped contacts.",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8B95A7" }}>
        <ShieldCheck size={12} style={{ color: "#8B85FF" }} />
        Messaging Status · RESPONSE method · 24-hour window
      </div>

      {rows.map(row => (
        compact && row.label === "Total Selected Contacts" ? null : (
          <div key={row.label} className="p-3.5 rounded-xl flex flex-col gap-1.5"
            style={{ background: row.bg, border: `1px solid ${row.border}` }}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12.5px] font-semibold" style={{ color: "#F5F7FA" }}>{row.label}</span>
              <span className="text-[15px] font-bold shrink-0 tabular-nums" style={{ color: row.color }}>
                {row.value.toLocaleString()}
              </span>
            </div>
            <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(139,149,167,0.85)" }}>{row.note}</p>
          </div>
        )
      ))}

      {/* Platform rule notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl text-[11.5px] leading-relaxed"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#8B95A7" }}>
        <Info size={12} className="mt-0.5 shrink-0" style={{ color: "#8B95A7" }} />
        <span>
          This application sends messages using Facebook Messenger&apos;s <strong style={{ color: "#F5F7FA" }}>RESPONSE</strong> messaging type only.
          This requires the recipient to have sent a message to your Page in the last 24 hours.
          Contacts outside this window <strong style={{ color: "#F5F7FA" }}>cannot receive a message</strong> through this system — there is no alternative method, tag, or workaround available here.
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Select Recipients
// ─────────────────────────────────────────────────────────────────────────────

function StepRecipients({ pageId, mode, onModeChange, selectedContactIds, onContactsChange, selectedGroupIds, onGroupsChange, eligibility, eligibilityLoading }: {
  pageId: string; mode: RecipientMode; onModeChange: (m: RecipientMode) => void;
  selectedContactIds: Set<string>; onContactsChange: (ids: Set<string>) => void;
  selectedGroupIds: Set<string>; onGroupsChange: (ids: Set<string>) => void;
  eligibility: EligibilityResult | null; eligibilityLoading: boolean;
}) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");

  useEffect(() => {
    if (mode !== "contacts" || !pageId) return;
    setContactsLoading(true);
    const p = new URLSearchParams({ pageId, limit: "150" });
    if (contactSearch) p.set("search", contactSearch);
    fetch(`/api/contacts?${p}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { contacts?: ContactItem[] } | null) => { if (d?.contacts) setContacts(d.contacts); })
      .catch(() => {}).finally(() => setContactsLoading(false));
  }, [pageId, mode, contactSearch]);

  useEffect(() => {
    if (mode !== "groups") return;
    setGroupsLoading(true);
    const p = new URLSearchParams();
    if (groupSearch) p.set("search", groupSearch);
    fetch(`/api/groups?${p}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { groups?: GroupItem[] } | null) => { if (d?.groups) setGroups(d.groups); })
      .catch(() => {}).finally(() => setGroupsLoading(false));
  }, [mode, groupSearch]);

  const toggleContact = (id: string) => {
    const next = new Set(selectedContactIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onContactsChange(next);
  };
  const toggleGroup = (id: string) => {
    const next = new Set(selectedGroupIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onGroupsChange(next);
  };

  const MODES: Array<{ key: RecipientMode; title: string; desc: string; icon: React.ComponentType<{ size?: number }> }> = [
    { key: "all",      title: "All page contacts",   desc: "Every subscriber on this channel — eligibility is checked automatically", icon: Users },
    { key: "contacts", title: "Select contacts",      desc: "Manually choose individual contacts to include", icon: UserCheck },
    { key: "groups",   title: "Customer groups",      desc: "Send to all members of one or more contact groups", icon: Users },
  ];

  const dotColor = { open: "#10B981", closed: "#F59E0B", never: "#8B95A7" } as const;

  return (
    <div className="flex flex-col gap-6">
      {/* Mode selection */}
      <div>
        <label className="text-[10.5px] font-semibold uppercase tracking-widest block mb-3" style={{ color: "#8B95A7" }}>Recipient Audience</label>
        <div className="flex flex-col gap-2">
          {MODES.map(m => (
            <button key={m.key} onClick={() => onModeChange(m.key)}
              className="flex items-center gap-4 p-4 rounded-xl text-left"
              style={{ background: mode === m.key ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${mode === m.key ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: mode === m.key ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.04)", color: mode === m.key ? "#8B85FF" : "#8B95A7" }}>
                <m.icon size={16} />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{m.title}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>{m.desc}</div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: mode === m.key ? "#6C63FF" : "rgba(255,255,255,0.2)" }}>
                {mode === m.key && <div className="w-2 h-2 rounded-full" style={{ background: "#6C63FF" }} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Contact picker */}
      {mode === "contacts" && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
            <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts…"
              className="w-full pl-8 pr-3 py-2.5 rounded-lg text-[13px] outline-none" style={FIELD_STYLE} />
          </div>

          {contactsLoading ? (
            <div className="flex items-center gap-2 py-4 text-[12.5px]" style={{ color: "#8B95A7" }}>
              <Loader2 size={13} className="animate-spin" /> Loading contacts…
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-[12.5px] py-4" style={{ color: "#8B95A7" }}>{contactSearch ? "No contacts match." : "No contacts found on this page."}</p>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11.5px]">
                <span style={{ color: "#8B95A7" }}>{contacts.length} contacts — {selectedContactIds.size} selected</span>
                <button onClick={() => onContactsChange(selectedContactIds.size === contacts.length ? new Set() : new Set(contacts.map(c => c.id)))}
                  className="font-medium" style={{ color: "#8B85FF" }}>
                  {selectedContactIds.size === contacts.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                {contacts.map(c => {
                  const ws = windowStatus(c);
                  const sel = selectedContactIds.has(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleContact(c.id)}
                      className="flex items-center gap-3 p-2.5 rounded-lg text-left"
                      style={{ background: sel ? "rgba(108,99,255,0.08)" : "transparent", border: `1px solid ${sel ? "rgba(108,99,255,0.2)" : "transparent"}` }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                        style={{ background: sel ? "#6C63FF" : "rgba(255,255,255,0.06)", border: sel ? "none" : "1px solid rgba(255,255,255,0.12)" }}>
                        {sel && <Check size={9} color="#fff" />}
                      </div>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor[ws] }}
                        title={ws === "open" ? "Window open" : ws === "closed" ? "Window closed (>24h)" : "Never messaged"} />
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>
                        {displayName(c).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12.5px]" style={{ color: "#F5F7FA" }}>{displayName(c)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 text-[10.5px]" style={{ color: "#8B95A7" }}>
                {(["open", "closed", "never"] as const).map(s => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: dotColor[s] }} />
                    {s === "open" ? "Window open" : s === "closed" ? "Window closed" : "Never messaged"}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Group picker */}
      {mode === "groups" && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
            <input value={groupSearch} onChange={e => setGroupSearch(e.target.value)} placeholder="Search groups…"
              className="w-full pl-8 pr-3 py-2.5 rounded-lg text-[13px] outline-none" style={FIELD_STYLE} />
          </div>

          {groupsLoading ? (
            <div className="flex items-center gap-2 py-4 text-[12.5px]" style={{ color: "#8B95A7" }}>
              <Loader2 size={13} className="animate-spin" /> Loading groups…
            </div>
          ) : groups.length === 0 ? (
            <p className="text-[12.5px] py-4" style={{ color: "#8B95A7" }}>No groups found. Create groups in the Audience section.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {groups.map(g => {
                const sel = selectedGroupIds.has(g.id);
                return (
                  <button key={g.id} onClick={() => toggleGroup(g.id)}
                    className="flex items-center gap-3 p-3.5 rounded-xl text-left"
                    style={{ background: sel ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${sel ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}` }}>
                    <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={{ background: sel ? "#6C63FF" : "rgba(255,255,255,0.06)", border: sel ? "none" : "1px solid rgba(255,255,255,0.12)" }}>
                      {sel && <Check size={9} color="#fff" />}
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: g.color ?? "#6C63FF" + "22" }}>
                      <Users size={14} style={{ color: g.color ?? "#8B85FF" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{g.name}</div>
                      {g.description && <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>{g.description}</p>}
                    </div>
                    <span className="text-[12px] shrink-0" style={{ color: "#8B95A7" }}>{g._count.members.toLocaleString()} members</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Messaging Status / Compliance Summary */}
      <MessagingStatusPanel
        eligibility={eligibility}
        eligibilityLoading={eligibilityLoading}
        emptyReason={
          mode === "contacts" && selectedContactIds.size === 0 ? "Select contacts above to see messaging status." :
          mode === "groups" && selectedGroupIds.size === 0 ? "Select groups above to see messaging status." :
          !pageId ? "Select a channel above to check messaging status." : undefined
        }
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Fill Variables
// ─────────────────────────────────────────────────────────────────────────────

function StepVariables({ template, fieldValues, onChange }: {
  template: AvailableTemplate; fieldValues: Record<string, string>; onChange: (key: string, val: string) => void;
}) {
  const allVars = extractVars(template.content);
  const contactVars = allVars.filter(v => CONTACT_VARS.has(v));
  const customVars = allVars.filter(v => !CONTACT_VARS.has(v));

  // Build field metadata — use template.fields if available, else infer
  const fieldMeta = new Map<string, TemplateField>();
  if (template.fields) {
    for (const f of template.fields) fieldMeta.set(f.key, f);
  }
  const getField = (key: string): TemplateField =>
    fieldMeta.get(key) ?? { key, label: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), type: "TEXT", required: true };

  if (allVars.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
          <Check size={22} style={{ color: "#10B981" }} />
        </div>
        <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No variables required</div>
        <p className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>This template has a fixed message — no fields to fill in. You can proceed to preview.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Contact-auto vars */}
      {contactVars.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <div className="flex items-center gap-2 mb-2">
            <UserCheck size={13} style={{ color: "#10B981" }} />
            <span className="text-[12px] font-semibold" style={{ color: "#10B981" }}>Auto-filled from contact data</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {contactVars.map(v => (
              <span key={v} className="text-[10.5px] font-mono px-2 py-0.5 rounded flex items-center gap-1"
                style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                {`{{${v}}}`}
                <span className="font-sans text-[9px] opacity-70">auto</span>
              </span>
            ))}
          </div>
          <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>
            These values are automatically replaced with each recipient&apos;s contact data when the message is sent — no input needed.
          </p>
        </div>
      )}

      {/* Custom var fields */}
      {customVars.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-widest block mb-0.5" style={{ color: "#8B95A7" }}>Fill in required values</span>
            <p className="text-[11.5px]" style={{ color: "#8B95A7" }}>These values are the same for all recipients in this message.</p>
          </div>
          {customVars.map(key => {
            const f = getField(key);
            const val = fieldValues[key] ?? "";
            const typeErr = validateField(f.type, val);
            const missing = f.required && !val.trim();
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-[12.5px] font-medium" style={{ color: "#F5F7FA" }}>
                    {f.label}
                    {f.required && <span style={{ color: "#EF4444" }}>*</span>}
                  </label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>{f.type}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>{`{{${key}}}`}</span>
                </div>
                <FieldInput field={f} value={val} onChange={v => onChange(key, v)} />
                {missing && val !== "" && <p className="text-[11px] mt-1" style={{ color: "#EF4444" }}>This field is required</p>}
                {typeErr && !missing && <p className="text-[11px] mt-1" style={{ color: "#F59E0B" }}>{typeErr}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Preview
// ─────────────────────────────────────────────────────────────────────────────

function StepPreview({ template, fieldValues, pageName, eligibility }: {
  template: AvailableTemplate; fieldValues: Record<string, string>;
  pageName?: string; eligibility: EligibilityResult | null;
}) {
  const preview = renderPreview(template.content, fieldValues, pageName);
  const allVars = extractVars(template.content);
  const contactVars = allVars.filter(v => CONTACT_VARS.has(v));
  const customVars = allVars.filter(v => !CONTACT_VARS.has(v));
  const unfilled = customVars.filter(v => !(fieldValues[v] ?? "").trim());

  return (
    <div className="flex flex-col gap-6">
      {/* Message preview box */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#8B95A7" }}>Message Preview</span>
          {contactVars.length > 0 && (
            <span className="text-[11px] flex items-center gap-1" style={{ color: "#8B95A7" }}>
              <Info size={11} /> Sample contact data shown
            </span>
          )}
        </div>

        {/* Messenger bubble simulation */}
        <div className="p-5 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: "#6C63FF" }}>
              {(pageName ?? "P").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[11px] mb-1.5" style={{ color: "#8B95A7" }}>{pageName ?? "Your Page"} · via Messenger</div>
              <div className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed whitespace-pre-wrap max-w-[400px]"
                style={{ background: "rgba(255,255,255,0.07)", color: "#F5F7FA", fontFamily: "inherit" }}>
                {preview}
              </div>
            </div>
          </div>
        </div>

        {contactVars.length > 0 && (
          <p className="text-[11px] mt-2" style={{ color: "#8B95A7" }}>Each recipient receives a personalized version with their own contact data substituted in.</p>
        )}
      </div>

      {unfilled.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-[12.5px]" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{unfilled.length} variable{unfilled.length !== 1 ? "s are" : " is"} not yet filled in: {unfilled.map(v => `{{${v}}}`).join(", ")}. Go back to Step 3 to complete them.</span>
        </div>
      )}

      {/* Template details */}
      <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#8B95A7" }}>Message Details</span>
        <div className="grid grid-cols-2 gap-y-3 text-[12.5px]">
          <div>
            <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Template</span>
            <span style={{ color: "#F5F7FA" }}>{template.name}</span>
          </div>
          {template.category && (
            <div>
              <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Category</span>
              <span style={{ color: "#F5F7FA" }}>{template.category}</span>
            </div>
          )}
          {eligibility && (
            <>
              <div>
                <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Will send to</span>
                <span style={{ color: "#10B981" }}>{eligibility.eligibleForMethod.toLocaleString()} eligible</span>
              </div>
              <div>
                <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Total selected</span>
                <span style={{ color: "#F5F7FA" }}>{eligibility.total.toLocaleString()}</span>
              </div>
              {eligibility.cannotSend > 0 && (
                <div>
                  <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Will skip</span>
                  <span style={{ color: "#F59E0B" }}>{eligibility.cannotSend.toLocaleString()} ineligible</span>
                </div>
              )}
            </>
          )}
          <div>
            <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Message type</span>
            <span style={{ color: "#F5F7FA" }}>Utility notification</span>
          </div>
          <div>
            <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Channel</span>
            <span style={{ color: "#F5F7FA" }}>Facebook Messenger</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Compliance Validation
// ─────────────────────────────────────────────────────────────────────────────

type CheckStatus = "pass" | "fail" | "warn" | "loading";
interface ComplianceCheck { label: string; detail: string; status: CheckStatus; }

function CheckRow({ check }: { check: ComplianceCheck }) {
  const icon = check.status === "loading"
    ? <Loader2 size={14} className="animate-spin" style={{ color: "#8B95A7" }} />
    : check.status === "pass"
    ? <Check size={14} style={{ color: "#10B981" }} />
    : check.status === "warn"
    ? <AlertTriangle size={14} style={{ color: "#F59E0B" }} />
    : <AlertCircle size={14} style={{ color: "#EF4444" }} />;

  const colors = { pass: "#10B981", fail: "#EF4444", warn: "#F59E0B", loading: "#8B95A7" };
  const bgs = { pass: "rgba(16,185,129,0.04)", fail: "rgba(239,68,68,0.04)", warn: "rgba(245,158,11,0.04)", loading: "rgba(255,255,255,0.02)" };

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: bgs[check.status], border: `1px solid ${colors[check.status]}22` }}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{check.label}</div>
        <p className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: colors[check.status] }}>{check.detail}</p>
      </div>
    </div>
  );
}

function StepCompliance({ template, fieldValues, eligibility, eligibilityLoading, recipientCount }: {
  template: AvailableTemplate; fieldValues: Record<string, string>;
  eligibility: EligibilityResult | null; eligibilityLoading: boolean; recipientCount: number;
}) {
  const allVars = extractVars(template.content);
  const customVars = allVars.filter(v => !CONTACT_VARS.has(v));
  const unfilledVars = customVars.filter(v => !(fieldValues[v] ?? "").trim());

  const checks: ComplianceCheck[] = [
    {
      label: "Template is approved for sending",
      detail: template.source === "global"
        ? "Platform-approved global template."
        : "Internally approved workspace template. Note: this approval is internal only — it does not represent Meta platform approval.",
      status: "pass",
    },
    {
      label: "Required variables completed",
      detail: unfilledVars.length === 0
        ? "All template variables are filled in."
        : `${unfilledVars.length} required variable${unfilledVars.length !== 1 ? "s are" : " is"} missing: ${unfilledVars.map(v => `{{${v}}}`).join(", ")}.`,
      status: unfilledVars.length === 0 ? "pass" : "fail",
    },
    {
      label: "Recipient selection",
      detail: recipientCount > 0
        ? `${recipientCount.toLocaleString()} recipient${recipientCount !== 1 ? "s" : ""} selected.`
        : "No recipients selected. Go back to step 2.",
      status: recipientCount > 0 ? "pass" : "fail",
    },
    {
      label: "Messaging window check (RESPONSE · 24-hour rule)",
      detail: eligibilityLoading
        ? "Checking messaging status…"
        : eligibility === null
        ? "Messaging status unknown — complete recipient selection first."
        : eligibility.eligibleForMethod === 0
        ? `None of the ${eligibility.total.toLocaleString()} selected contacts have an active Messenger window. The RESPONSE messaging type requires recipients to have sent a message to this Page within the last 24 hours. There is no alternative sending method available.`
        : eligibility.cannotSend > 0
        ? `${eligibility.eligibleForMethod.toLocaleString()} of ${eligibility.total.toLocaleString()} contacts are eligible. ${eligibility.cannotSend.toLocaleString()} will be skipped (window expired, never messaged, or opted out). No credits are charged for skipped contacts.`
        : `All ${eligibility.eligibleForMethod.toLocaleString()} selected contact${eligibility.eligibleForMethod !== 1 ? "s have" : " has"} an active 24-hour Messenger window.`,
      status: eligibilityLoading ? "loading" : eligibility === null ? "warn" : eligibility.eligibleForMethod === 0 ? "fail" : eligibility.cannotSend > 0 ? "warn" : "pass",
    },
    {
      label: "Message type compliance",
      detail: "This is a utility notification. It will be sent via Facebook Messenger as messaging_type: RESPONSE, which requires an active 24-hour window opened by the recipient.",
      status: "pass",
    },
    {
      label: "Content restriction",
      detail: "Message content is locked to a pre-approved template. Free-form promotional content is not permitted.",
      status: "pass",
    },
  ];

  const blocking = checks.filter(c => c.status === "fail");
  const allClear = blocking.length === 0 && !eligibilityLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 p-4 rounded-xl text-[12.5px]"
        style={{ background: allClear ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${allClear ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`, color: allClear ? "#10B981" : "#F59E0B" }}>
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <span>
          {allClear
            ? "All compliance checks passed. This message is ready to send."
            : blocking.length > 0
            ? `${blocking.length} issue${blocking.length !== 1 ? "s" : ""} must be resolved before sending.`
            : "Checks in progress…"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {checks.map((c, i) => <CheckRow key={i} check={c} />)}
      </div>

      {/* Detailed messaging status breakdown */}
      {(eligibility || eligibilityLoading) && (
        <div className="mt-1">
          <MessagingStatusPanel
            eligibility={eligibility}
            eligibilityLoading={eligibilityLoading}
            compact={true}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 — Send / Schedule
// ─────────────────────────────────────────────────────────────────────────────

function StepSend({ broadcastName, template, eligibility, schedule, onScheduleChange, schedDate, onSchedDateChange }: {
  broadcastName: string; template: AvailableTemplate;
  eligibility: EligibilityResult | null;
  schedule: "now" | "later"; onScheduleChange: (s: "now" | "later") => void;
  schedDate: string; onSchedDateChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.2)" }}>
        <span className="text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#8B85FF" }}>Ready to send</span>
        <div className="grid grid-cols-2 gap-y-2.5 text-[12.5px]">
          <div>
            <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Message</span>
            <span style={{ color: "#F5F7FA" }}>{broadcastName || "—"}</span>
          </div>
          <div>
            <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Template</span>
            <span style={{ color: "#F5F7FA" }}>{template.name}</span>
          </div>
          {eligibility && (
            <>
              <div>
                <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Will send to</span>
                <span style={{ color: "#10B981" }}>{eligibility.eligibleForMethod.toLocaleString()} eligible recipient{eligibility.eligibleForMethod !== 1 ? "s" : ""}</span>
              </div>
              {eligibility.cannotSend > 0 && (
                <div>
                  <span className="block text-[10.5px] mb-0.5" style={{ color: "#8B95A7" }}>Will skip</span>
                  <span style={{ color: "#F59E0B" }}>{eligibility.cannotSend.toLocaleString()} ineligible</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delivery timing */}
      <div>
        <label className="text-[10.5px] font-semibold uppercase tracking-widest block mb-3" style={{ color: "#8B95A7" }}>Delivery Timing</label>
        <div className="flex flex-col gap-2">
          {([
            { key: "now" as const, label: "Send immediately", sub: "Delivery begins within 60 seconds", icon: Send },
            { key: "later" as const, label: "Schedule for later", sub: "Choose a date and time to send", icon: Calendar },
          ]).map(({ key, label, sub, icon: Icon }) => (
            <button key={key} onClick={() => onScheduleChange(key)}
              className="flex items-center gap-4 p-4 rounded-xl text-left"
              style={{ background: schedule === key ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${schedule === key ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: schedule === key ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.04)" }}>
                <Icon size={15} style={{ color: schedule === key ? "#8B85FF" : "#8B95A7" }} />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{label}</div>
                <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{sub}</div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: schedule === key ? "#6C63FF" : "rgba(255,255,255,0.2)" }}>
                {schedule === key && <div className="w-2 h-2 rounded-full" style={{ background: "#6C63FF" }} />}
              </div>
            </button>
          ))}
        </div>

        {schedule === "later" && (
          <div className="mt-3">
            <label className="text-[10.5px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: "#8B95A7" }}>Scheduled Date &amp; Time</label>
            <input type="datetime-local" value={schedDate} onChange={e => onSchedDateChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none" style={FIELD_STYLE} />
          </div>
        )}
      </div>

      {/* Credits notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl text-[11.5px]"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#8B95A7" }}>
        <Clock size={12} className="mt-0.5 shrink-0" />
        1 credit is deducted per successfully delivered message. Recipients outside the 24-hour window are skipped — no credits charged.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Done screen
// ─────────────────────────────────────────────────────────────────────────────

function DoneScreen({ result, onClose }: {
  result: { status: string; queued?: boolean; message?: string; sent?: number; failed?: number; ineligible?: number };
  onClose: () => void;
}) {
  const isDraft = result.status === "draft";
  const isScheduled = result.status === "scheduled";
  const isQueued = result.queued;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 gap-5">
      <div className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: isDraft ? "rgba(139,149,167,0.1)" : isQueued ? "rgba(108,99,255,0.12)" : "rgba(16,185,129,0.12)" }}>
        {isDraft ? <FileText size={24} style={{ color: "#8B95A7" }} />
          : isScheduled ? <Calendar size={24} style={{ color: "#10B981" }} />
          : <Send size={24} style={{ color: isQueued ? "#8B85FF" : "#10B981" }} />}
      </div>

      <div className="text-center">
        <div className="text-[17px] font-semibold mb-1.5" style={{ color: "#F5F7FA" }}>
          {isDraft ? "Saved as draft" : isScheduled ? "Scheduled" : isQueued ? "Message queued for delivery" : "Message sent"}
        </div>
        <p className="text-[13px] leading-relaxed max-w-xs text-center" style={{ color: "#8B95A7" }}>
          {isDraft && "The message is saved in Utility Messages. Review and send it when ready."}
          {isScheduled && "The message will be sent at the scheduled time. Check Utility Messages to edit or cancel."}
          {isQueued && (result.message ?? "Recipients will start receiving the message within 60 seconds. Track progress in Send History.")}
        </p>
      </div>

      {!isDraft && !isScheduled && (result.sent !== undefined || result.ineligible !== undefined) && (
        <div className="flex items-center gap-5 text-[13px]">
          {(result.sent ?? 0) > 0 && <span style={{ color: "#10B981" }}>{result.sent} delivered</span>}
          {(result.ineligible ?? 0) > 0 && <span style={{ color: "#F59E0B" }}>{result.ineligible} skipped</span>}
          {((result.failed ?? 0) - (result.ineligible ?? 0)) > 0 && <span style={{ color: "#EF4444" }}>{(result.failed ?? 0) - (result.ineligible ?? 0)} failed</span>}
        </div>
      )}

      <button onClick={onClose} className="mt-2 px-8 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: "#6C63FF" }}>Done</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SendWorkflow
// ─────────────────────────────────────────────────────────────────────────────

export interface SendWorkflowProps {
  preSelectedTemplate?: { id: string; name: string; description: string | null; content: string; fields: TemplateField[] | null; category: string | null } | null;
  onClose: () => void;
  onCreated: () => void;
}

export function SendWorkflow({ preSelectedTemplate, onClose, onCreated }: SendWorkflowProps) {
  const { pages } = useWorkspace();

  const [step, setStep] = useState(1);
  const [done, setDone] = useState<{ status: string; queued?: boolean; message?: string; sent?: number; failed?: number; ineligible?: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Step 1
  const [broadcastName, setBroadcastName] = useState("");
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const [template, setTemplate] = useState<AvailableTemplate | null>(
    preSelectedTemplate ? { ...preSelectedTemplate, source: "global" } : null
  );

  // Step 2
  const [mode, setMode] = useState<RecipientMode>("all");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  // Step 3
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Step 6
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [schedDate, setSchedDate] = useState("");

  // Group → contact ID resolution cache
  const [resolvedGroupContacts, setResolvedGroupContacts] = useState<Record<string, string[]>>({});

  const selectedPage = pages.find(p => p.id === pageId);

  // Reset field values when template changes
  const templateId = template?.id;
  useEffect(() => {
    if (!template) return;
    const init: Record<string, string> = {};
    const vars = extractVars(template.content).filter(v => !CONTACT_VARS.has(v));
    vars.forEach(v => { init[v] = ""; });
    setFieldValues(init);
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve groups to contact IDs
  useEffect(() => {
    if (mode !== "groups" || selectedGroupIds.size === 0) return;
    const unresolved = [...selectedGroupIds].filter(gid => !(gid in resolvedGroupContacts));
    if (!unresolved.length) return;
    unresolved.forEach(gid => {
      fetch(`/api/groups/${gid}/members`)
        .then(r => r.ok ? r.json() : null)
        .then((d: { members?: Array<{ contact: ContactItem }> } | null) => {
          if (d?.members) {
            setResolvedGroupContacts(prev => ({ ...prev, [gid]: d.members!.map(m => m.contact.id) }));
          }
        })
        .catch(() => {});
    });
  }, [mode, selectedGroupIds, resolvedGroupContacts]);

  // Build the effective contact ID set for eligibility checks
  const effectiveContactIds = useRef<string[]>([]);
  useEffect(() => {
    if (mode === "contacts") effectiveContactIds.current = [...selectedContactIds];
    else if (mode === "groups") {
      const all = new Set<string>();
      for (const gid of selectedGroupIds) {
        for (const cid of resolvedGroupContacts[gid] ?? []) all.add(cid);
      }
      effectiveContactIds.current = [...all];
    } else effectiveContactIds.current = [];
  }, [mode, selectedContactIds, selectedGroupIds, resolvedGroupContacts]);

  // Eligibility check — fires when page/recipient selection changes
  const eligibilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!pageId) { setEligibility(null); return; }
    if (mode === "contacts" && selectedContactIds.size === 0) { setEligibility(null); return; }
    if (mode === "groups" && selectedGroupIds.size === 0) { setEligibility(null); return; }

    if (eligibilityTimer.current) clearTimeout(eligibilityTimer.current);
    eligibilityTimer.current = setTimeout(async () => {
      setEligibilityLoading(true);
      try {
        const body: Record<string, unknown> = { pageId };
        if (mode === "contacts") body.contactIds = [...selectedContactIds];
        else if (mode === "groups") body.contactIds = effectiveContactIds.current;
        const res = await fetch("/api/broadcasts/eligibility-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) { const d = await res.json() as EligibilityResult; setEligibility(d); }
      } catch {} finally { setEligibilityLoading(false); }
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, mode, selectedContactIds.size, selectedGroupIds.size, Object.keys(resolvedGroupContacts).length]);

  // Derived values
  const customVars = template ? extractVars(template.content).filter(v => !CONTACT_VARS.has(v)) : [];
  const unfilledVars = customVars.filter(v => !(fieldValues[v] ?? "").trim());
  const hasValidFieldValues = unfilledVars.length === 0;

  const recipientCount = (() => {
    if (mode === "all") return eligibility?.total ?? 0;
    if (mode === "contacts") return selectedContactIds.size;
    if (mode === "groups") {
      return [...selectedGroupIds].reduce((sum, gid) => sum + (resolvedGroupContacts[gid]?.length ?? 0), 0);
    }
    return 0;
  })();

  // Per-step "can continue" logic
  const canContinue = (() => {
    if (step === 1) return !!broadcastName.trim() && !!template && !!pageId;
    if (step === 2) {
      if (mode === "contacts") return selectedContactIds.size > 0;
      if (mode === "groups") return selectedGroupIds.size > 0;
      return true; // "all"
    }
    if (step === 3) return hasValidFieldValues;
    if (step === 4) return hasValidFieldValues;
    if (step === 5) return hasValidFieldValues && recipientCount > 0 && !eligibilityLoading && (eligibility?.eligibleForMethod ?? 0) > 0;
    if (step === 6) return schedule === "now" || (schedule === "later" && !!schedDate);
    return true;
  })();

  const handleSubmit = async (mode_: "send" | "schedule" | "draft") => {
    if (!template || !pageId) return;
    setSubmitting(true); setSubmitError("");
    try {
      const body: Record<string, unknown> = {
        name: broadcastName.trim(),
        pageId,
        fieldValues,
      };

      if (template.source === "global") body.templateId = template.id;
      else body.messageTemplateId = template.id;

      if (mode === "all") body.allPageContacts = true;
      else body.contactIds = mode === "contacts" ? [...selectedContactIds] : effectiveContactIds.current;

      if (mode_ === "schedule" && schedDate) body.scheduledAt = schedDate;

      const res = await fetch("/api/broadcasts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setSubmitError(d.error ?? "Failed to create message."); return;
      }
      const { broadcast } = await res.json() as { broadcast: { id: string } };

      if (mode_ === "draft") { setDone({ status: "draft" }); onCreated(); return; }
      if (mode_ === "schedule") { setDone({ status: "scheduled" }); onCreated(); return; }

      const sendRes = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: "POST" });
      const sendData = await sendRes.json() as { queued?: boolean; message?: string; status?: string; sent?: number; failed?: number; ineligible?: number; error?: string };
      if (!sendRes.ok) { setSubmitError(sendData.error ?? "Message saved but send failed."); onCreated(); return; }
      setDone({ status: sendData.status ?? "sending", queued: sendData.queued, message: sendData.message, sent: sendData.sent, failed: sendData.failed, ineligible: sendData.ineligible });
      onCreated();
    } catch { setSubmitError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#080F18", border: "1px solid rgba(255,255,255,0.1)" }}>
          <DoneScreen result={done} onClose={onClose} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />

      <div className="relative w-full max-w-[860px] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#080F18", border: "1px solid rgba(255,255,255,0.09)", maxHeight: "calc(100vh - 48px)" }}
        onClick={e => e.stopPropagation()}>

        {/* ── Top header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Send Utility Message</h2>
            <p className="text-[11.5px] mt-0.5" style={{ color: "#8B95A7" }}>Compliant notification messaging via Facebook Messenger</p>
          </div>
          {!submitting && <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>}
        </div>

        {/* ── Step bar ────────────────────────────────────────────── */}
        <div className="flex items-center px-6 py-3 shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)", gap: 0 }}>
          {STEPS.map((s, i) => {
            const done_ = step > s.id;
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center shrink-0">
                <button onClick={() => done_ && setStep(s.id)} disabled={!done_}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                  style={{ opacity: !done_ && !active ? 0.4 : 1 }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: done_ ? "#10B981" : active ? "#6C63FF" : "rgba(255,255,255,0.08)" }}>
                    {done_ ? <Check size={10} color="#fff" /> : <Icon size={9} color={active ? "#fff" : "#8B95A7"} />}
                  </div>
                  <span className="text-[11.5px] font-medium" style={{ color: active ? "#F5F7FA" : done_ ? "#10B981" : "#8B95A7" }}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={12} className="mx-1 shrink-0" style={{ color: "rgba(255,255,255,0.12)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          {step === 1 && (
            <StepTemplate broadcastName={broadcastName} onNameChange={setBroadcastName}
              pageId={pageId} onPageChange={setPageId}
              template={template} onSelect={t => { setTemplate(t); }} />
          )}
          {step === 2 && (
            <StepRecipients pageId={pageId} mode={mode} onModeChange={m => { setMode(m); setSelectedContactIds(new Set()); setSelectedGroupIds(new Set()); }}
              selectedContactIds={selectedContactIds} onContactsChange={setSelectedContactIds}
              selectedGroupIds={selectedGroupIds} onGroupsChange={setSelectedGroupIds}
              eligibility={eligibility} eligibilityLoading={eligibilityLoading} />
          )}
          {step === 3 && template && (
            <StepVariables template={template} fieldValues={fieldValues}
              onChange={(k, v) => setFieldValues(prev => ({ ...prev, [k]: v }))} />
          )}
          {step === 4 && template && (
            <StepPreview template={template} fieldValues={fieldValues}
              pageName={selectedPage?.name} eligibility={eligibility} />
          )}
          {step === 5 && template && (
            <StepCompliance template={template} fieldValues={fieldValues}
              eligibility={eligibility} eligibilityLoading={eligibilityLoading}
              recipientCount={recipientCount} />
          )}
          {step === 6 && template && (
            <StepSend broadcastName={broadcastName} template={template}
              eligibility={eligibility} schedule={schedule} onScheduleChange={setSchedule}
              schedDate={schedDate} onSchedDateChange={setSchedDate} />
          )}

          {submitError && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl text-[12.5px]"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> {submitError}
            </div>
          )}
        </div>

        {/* ── Footer nav ──────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {step > 1 && !submitting && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {!submitting && step < 6 && (
            <button onClick={() => setStep(s => s + 1)} disabled={!canContinue}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: "#6C63FF", opacity: canContinue ? 1 : 0.4 }}>
              Continue <ChevronRight size={14} />
            </button>
          )}
          {step === 6 && (
            <>
              {!submitting && (
                <button onClick={() => handleSubmit("draft")} disabled={!broadcastName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: !broadcastName.trim() ? "#8B95A7" : "#F5F7FA", opacity: !broadcastName.trim() ? 0.5 : 1 }}>
                  <FileText size={13} /> Save Draft
                </button>
              )}
              <button onClick={() => handleSubmit(schedule === "now" ? "send" : "schedule")}
                disabled={submitting || !canContinue}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: "#6C63FF", opacity: (submitting || !canContinue) ? 0.5 : 1 }}>
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> {schedule === "later" ? "Scheduling…" : "Sending…"}</>
                  : schedule === "now"
                  ? <><Send size={14} /> {eligibility ? `Send to ${eligibility.eligibleForMethod.toLocaleString()} Recipient${eligibility.eligibleForMethod !== 1 ? "s" : ""}` : "Send Message"}</>
                  : <><Calendar size={14} /> Schedule Message</>}
              </button>
            </>
          )}
          {step === 1 && (
            <div className="ml-auto flex items-center gap-2 text-[11.5px]" style={{ color: "#8B95A7" }}>
              <ShieldCheck size={12} style={{ color: "#10B981" }} />
              Template-locked — no free-form message entry
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
