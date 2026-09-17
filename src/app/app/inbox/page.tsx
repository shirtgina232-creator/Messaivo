"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, Circle, Send, FileText, X,
  Tag, UserCheck, CheckCircle, MessageSquare,
  Clock, AlertTriangle, Loader2, ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useWorkspace, derivedPageColor, derivedPageAvatar } from "@/lib/workspace-context";

// ── Types ──────────────────────────────────────────────────────────────────────

type ConvContact = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePicUrl: string | null;
  lastMessageAt: string | null;
};
type ConvPage = { id: string; pageName: string; pageAvatar: string | null };
type Conversation = {
  id: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string | null;
  contact: ConvContact;
  page: ConvPage;
};
type Message = {
  id: string;
  direction: "inbound" | "outbound";
  content: string | null;
  messageType: string;
  createdAt: string;
  sentAt: string | null;
};
type Template = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  fields: unknown;
  category: string | null;
  source: "global" | "workspace";
  status?: string;
  tags?: string[];
  pageId?: string | null;
};

// inbox view mode
type InboxView = "inbox" | "template-browser" | "template-preview";

// ── Helpers ────────────────────────────────────────────────────────────────────

const WINDOW_MS = 24 * 60 * 60 * 1000;
const BORDER = "rgba(255,255,255,0.07)";

function windowStatus(contact: ConvContact): "open" | "closed" | "never" {
  if (!contact.lastMessageAt) return "never";
  return Date.now() - new Date(contact.lastMessageAt).getTime() < WINDOW_MS ? "open" : "closed";
}

function windowAgeLabel(contact: ConvContact): string {
  if (!contact.lastMessageAt) return "No inbound messages";
  const diff = Date.now() - new Date(contact.lastMessageAt).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h === 0) return `${m}m ago`;
  if (h < 24) return `${h}h ${m}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  open:     { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
  assigned: { bg: "rgba(108,99,255,0.1)",  color: "#8B85FF" },
  closed:   { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
  snoozed:  { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
};
const FILTERS = ["All", "Unread", "Open", "Closed"];

function contactName(c: ConvContact): string {
  if (c.name) return c.name;
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unknown";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(diff / 3_600_000);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function msgTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Extract {{variable_name}} placeholders from template content */
function parseVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) ?? [];
  return [...new Set(matches.map(m => m.slice(2, -2).trim()))];
}

/** Replace {{var}} with filled value or styled placeholder */
function renderPreview(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (_, name) => {
    const trimmed = name.trim();
    return vars[trimmed] !== undefined && vars[trimmed] !== "" ? vars[trimmed] : `{{${trimmed}}}`;
  });
}

// ── Window Badge ───────────────────────────────────────────────────────────────

function WindowBadge({ contact }: { contact: ConvContact }) {
  const status = windowStatus(contact);
  const label = windowAgeLabel(contact);
  if (status === "open") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
        style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.18)" }}>
        <Circle size={5} fill="currentColor" />Window open · {label}
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
        style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.18)" }}>
        <Clock size={10} />Window closed · {label}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
      style={{ background: "rgba(139,149,167,0.08)", color: "#8B95A7", border: "1px solid rgba(139,149,167,0.15)" }}>
      <Circle size={5} />No inbound messages
    </span>
  );
}

// ── Template Browser (full view — replaces the messages area) ──────────────────

function TemplateBrowser({
  templates,
  loading,
  loadError,
  pageName,
  onSelect,
  onBack,
}: {
  templates: Template[];
  loading: boolean;
  loadError: string;
  pageName: string;
  onSelect: (t: Template) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category).filter(Boolean) as string[]);
    return ["all", ...Array.from(cats).sort()];
  }, [templates]);

  const filtered = useMemo(() =>
    templates.filter(t => {
      const matchSearch = !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "all" || t.category === activeCategory;
      return matchSearch && matchCat;
    }),
  [templates, search, activeCategory]);

  return (
    <div className="flex flex-col h-full" style={{ background: "#07090D" }}>
      {/* Browser header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: BORDER, background: "#07090D" }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7", border: `1px solid ${BORDER}` }}>
          <ArrowLeft size={13} /> Back to conversation
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>Select a Template</div>
          <div className="text-[11px]" style={{ color: "#8B95A7" }}>
            Showing templates for <span style={{ color: "#8B85FF" }}>{pageName}</span>
            {!loading && !loadError && ` · ${templates.length} available`}
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="px-5 pt-3 pb-2 shrink-0 flex flex-col gap-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Search size={13} style={{ color: "#8B95A7" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, description, or content…"
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: "#F5F7FA" }}
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch("")}><X size={12} style={{ color: "#8B95A7" }} /></button>
          )}
        </div>
        {categories.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button key={cat}
                onClick={() => setActiveCategory(cat)}
                className="shrink-0 text-[11px] font-medium px-3 py-1 rounded-lg capitalize transition-colors"
                style={{
                  background: activeCategory === cat ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.04)",
                  color: activeCategory === cat ? "#8B85FF" : "#8B95A7",
                  border: `1px solid ${activeCategory === cat ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}>
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: "#8B95A7" }} />
            <div className="text-[13px]" style={{ color: "#8B95A7" }}>Loading templates…</div>
          </div>
        ) : loadError ? (
          <div className="mx-auto max-w-sm mt-8 px-4 py-4 rounded-xl text-center"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <AlertTriangle size={20} style={{ color: "#EF4444", margin: "0 auto 8px" }} />
            <div className="text-[13px] font-semibold mb-1" style={{ color: "#EF4444" }}>Failed to load templates</div>
            <div className="text-[12px]" style={{ color: "#EF4444", opacity: 0.75 }}>{loadError}</div>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText size={32} style={{ color: "#8B95A7", opacity: 0.25 }} />
            <div className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>No templates yet</div>
            <div className="text-[12.5px] max-w-xs leading-relaxed" style={{ color: "#8B95A7" }}>
              Create message templates in <span style={{ color: "#8B85FF" }}>Settings → Templates</span>.
              Active templates appear here automatically.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="text-[13.5px]" style={{ color: "#F5F7FA" }}>No templates match your search</div>
            <button onClick={() => { setSearch(""); setActiveCategory("all"); }}
              className="text-[12px] underline" style={{ color: "#8B85FF" }}>Clear filters</button>
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {filtered.map(t => (
              <button key={t.id} onClick={() => onSelect(t)}
                className="text-left flex flex-col gap-2 px-4 py-3.5 rounded-xl transition-all group"
                style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)" }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(108,99,255,0.35)";
                  e.currentTarget.style.background = "#111824";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.background = "#101722";
                }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</span>
                      {t.source === "global" && (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF" }}>Platform</span>
                      )}
                      {t.status === "approved" && (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>Approved</span>
                      )}
                    </div>
                    {t.category && (
                      <span className="text-[10px] capitalize" style={{ color: "#8B95A7" }}>{t.category}</span>
                    )}
                  </div>
                  <ChevronRight size={14} style={{ color: "#8B95A7", marginTop: 2, flexShrink: 0 }} />
                </div>
                {t.description && (
                  <p className="text-[11.5px] italic leading-relaxed" style={{ color: "#8B95A7" }}>
                    {t.description}
                  </p>
                )}
                <p className="text-[12px] leading-relaxed" style={{ color: "rgba(245,247,250,0.5)" }}>
                  {t.content.slice(0, 120)}{t.content.length > 120 ? "…" : ""}
                </p>
                {parseVariables(t.content).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {parseVariables(t.content).slice(0, 4).map(v => (
                      <span key={v} className="text-[9.5px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: "rgba(108,99,255,0.08)", color: "#8B85FF" }}>
                        {"{{"}{v}{"}}"}
                      </span>
                    ))}
                    {parseVariables(t.content).length > 4 && (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded" style={{ color: "#8B95A7" }}>
                        +{parseVariables(t.content).length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Template Preview (variable fill + live preview) ────────────────────────────

function TemplatePreview({
  template,
  contact,
  pageName,
  windowClosed,
  onUseTemplate,
  onBack,
}: {
  template: Template;
  contact: ConvContact;
  pageName: string;
  windowClosed: boolean;
  onUseTemplate: (content: string) => void;
  onBack: () => void;
}) {
  const variables = useMemo(() => parseVariables(template.content), [template.content]);
  const [vars, setVars] = useState<Record<string, string>>(() =>
    Object.fromEntries(variables.map(v => [v, ""]))
  );
  const preview = useMemo(() => renderPreview(template.content, vars), [template.content, vars]);
  const firstName = contact.firstName ?? contactName(contact).split(" ")[0];

  // Auto-fill {{first_name}} / {{name}} with contact name
  useEffect(() => {
    setVars(prev => {
      const next = { ...prev };
      if ("first_name" in next && next.first_name === "") next.first_name = firstName;
      if ("name" in next && next.name === "") next.name = contactName(contact);
      return next;
    });
  }, [firstName, contact]);

  return (
    <div className="flex flex-col h-full" style={{ background: "#07090D" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: BORDER }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7", border: `1px solid ${BORDER}` }}>
          <ArrowLeft size={13} /> All templates
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>{template.name}</div>
          <div className="text-[11px]" style={{ color: "#8B95A7" }}>
            {pageName}
            {template.category && <span> · <span className="capitalize">{template.category}</span></span>}
            {template.source === "global" && <span> · <span style={{ color: "#8B85FF" }}>Platform template</span></span>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        {/* Window policy notice */}
        {windowClosed && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-[12px]"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
            <Clock size={14} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold mb-0.5">24-hour window is closed</div>
              <div style={{ opacity: 0.85 }}>
                The customer last messaged {windowAgeLabel(contact)}.
                Sending this template will attempt delivery — use only utility-type content.
              </div>
            </div>
          </div>
        )}

        {/* Variable fields */}
        {variables.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: "#8B95A7", opacity: 0.55 }}>Fill Variables</div>
            <div className="flex flex-col gap-3">
              {variables.map(v => (
                <div key={v}>
                  <label className="block text-[11.5px] font-medium mb-1.5"
                    style={{ color: "#C4CDD8" }}>
                    {v.replace(/_/g, " ")}
                    <span className="ml-1.5 font-normal font-mono text-[10px]"
                      style={{ color: "#8B85FF", opacity: 0.7 }}>{"{{"}{v}{"}}"}</span>
                  </label>
                  <input
                    value={vars[v] ?? ""}
                    onChange={e => setVars(prev => ({ ...prev, [v]: e.target.value }))}
                    placeholder={v.replace(/_/g, " ")}
                    className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                    style={{
                      background: "#101722",
                      border: "1px solid rgba(255,255,255,0.09)",
                      color: "#F5F7FA",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live preview */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: "#8B95A7", opacity: 0.55 }}>Message Preview</div>
          <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Mock chat bubble */}
            <div className="px-4 py-4">
              <div className="flex justify-end">
                <div className="max-w-sm px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{ background: "#6C63FF", color: "#fff", borderRadius: "14px 14px 2px 14px" }}>
                  {preview}
                </div>
              </div>
              <div className="text-right text-[10px] mt-1.5 pr-1" style={{ color: "#8B95A7" }}>
                Preview · not yet sent
              </div>
            </div>
            {/* Unfilled variables warning */}
            {parseVariables(preview).length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 border-t text-[11.5px]"
                style={{ borderColor: "rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.05)", color: "#F59E0B" }}>
                <AlertTriangle size={11} />
                {parseVariables(preview).length} variable{parseVariables(preview).length !== 1 ? "s" : ""} not filled yet
              </div>
            )}
          </div>
        </div>

        {/* Template content (raw) */}
        {template.description && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "#8B95A7", opacity: 0.55 }}>Description</div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "#8B95A7" }}>{template.description}</p>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="px-5 pb-5 pt-3 border-t shrink-0"
        style={{ borderColor: BORDER }}>
        <button
          onClick={() => onUseTemplate(preview)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13.5px] font-semibold text-white"
          style={{ background: "#6C63FF" }}>
          <CheckCircle size={15} />
          Use Template — Send to {contact.firstName ?? contactName(contact).split(" ")[0]}
        </button>
        {parseVariables(preview).length > 0 && (
          <p className="text-center text-[11px] mt-2" style={{ color: "#F59E0B" }}>
            Fill all variables above for the best result
          </p>
        )}
      </div>
    </div>
  );
}

// ── Inbox Page ─────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { pages } = useWorkspace();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filter, setFilter] = useState("All");
  const [pageFilter, setPageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [profileVisible, setProfileVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // view state — controls what is shown in the right panel
  const [view, setView] = useState<InboxView>("inbox");

  // Composer state
  const [composerTab, setComposerTab] = useState<"message" | "template">("message");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Template browser state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateLoadError, setTemplateLoadError] = useState("");
  const [browsingTemplate, setBrowsingTemplate] = useState<Template | null>(null);
  const lastTemplatePage = useRef<string | null>(null);

  const loadConversations = useCallback((quiet = false) => {
    if (!quiet) setLoadingConvs(true);
    const params = new URLSearchParams({ limit: "50" });
    if (pageFilter !== "all") params.set("pageId", pageFilter);
    fetch(`/api/conversations?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { conversations?: Conversation[] } | null) => {
        if (d?.conversations) {
          setConversations(d.conversations);
          if (!quiet && d.conversations.length > 0 && !activeId) {
            setActiveId(d.conversations[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!quiet) setLoadingConvs(false); });
  }, [pageFilter, activeId]);

  useEffect(() => { loadConversations(); }, [pageFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const iv = setInterval(() => loadConversations(true), 15_000);
    return () => clearInterval(iv);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    const iv = setInterval(() => {
      fetch(`/api/conversations/${activeId}/messages?limit=50`)
        .then(r => r.ok ? r.json() : null)
        .then((d: { messages?: Message[] } | null) => { if (d?.messages) setMessages(d.messages); })
        .catch(() => {});
    }, 10_000);
    return () => clearInterval(iv);
  }, [activeId]);

  // Reset to inbox view + clear composer when switching conversations
  useEffect(() => {
    if (!activeId) return;
    setView("inbox");
    setComposerTab("message");
    setInput("");
    setSelectedTemplate(null);
    setBrowsingTemplate(null);
    setSendError("");
    setLoadingMsgs(true);
    setMessages([]);
    fetch(`/api/conversations/${activeId}/messages?limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { messages?: Message[] } | null) => { if (d?.messages) setMessages(d.messages); })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load templates when entering template browser
  const fetchTemplates = useCallback((pageId: string | null) => {
    if (lastTemplatePage.current === pageId && templates.length > 0 && !templateLoadError) return;
    setLoadingTemplates(true);
    setTemplateLoadError("");
    setTemplates([]);
    const params = new URLSearchParams();
    if (pageId) params.set("pageId", pageId);
    fetch(`/api/inbox-templates?${params}`)
      .then(async r => {
        const d = await r.json() as { templates?: Template[]; error?: string };
        if (!r.ok) { setTemplateLoadError(d.error ?? `Server error (${r.status})`); return; }
        setTemplates(d.templates ?? []);
        lastTemplatePage.current = pageId;
      })
      .catch(err => setTemplateLoadError(`Network error: ${String(err)}`))
      .finally(() => setLoadingTemplates(false));
  }, [templates.length, templateLoadError]); // eslint-disable-line react-hooks/exhaustive-deps

  const openTemplateBrowser = () => {
    const pageId = conversations.find(c => c.id === activeId)?.page.id ?? null;
    fetchTemplates(pageId);
    setBrowsingTemplate(null);
    setView("template-browser");
  };

  const filteredConvs = conversations.filter(c => {
    const name = contactName(c.contact);
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" ? true
      : filter === "Unread" ? c.unreadCount > 0
      : filter.toLowerCase() === c.status;
    const matchPage = pageFilter === "all" || c.page.id === pageFilter;
    return matchSearch && matchFilter && matchPage;
  });

  const active = conversations.find(c => c.id === activeId);
  const activeWindow = active ? windowStatus(active.contact) : "open";

  const sendMessage = async () => {
    const textToSend = input.trim();
    if (!textToSend || !activeId) return;
    setSending(true);
    setSendError("");
    try {
      const body: Record<string, unknown> = { content: textToSend };
      if (selectedTemplate) body.templateId = selectedTemplate.id;
      const res = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json() as { message?: Message };
        if (d.message) setMessages(prev => [...prev, d.message!]);
        setConversations(prev => prev.map(c =>
          c.id === activeId ? { ...c, lastMessageAt: new Date().toISOString() } : c
        ));
        setInput("");
        setSelectedTemplate(null);
        setComposerTab("message");
      } else {
        const d = await res.json() as { error?: string };
        setSendError(d.error ?? "Failed to send message.");
      }
    } catch { setSendError("Network error. Please try again."); }
    finally { setSending(false); }
  };

  const closeConversation = async () => {
    if (!activeId) return;
    await fetch(`/api/conversations/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, status: "closed" } : c));
  };

  /** Called from TemplatePreview when agent clicks "Use Template" */
  const handleUseTemplate = (content: string) => {
    setInput(content);
    setSelectedTemplate(browsingTemplate);
    setComposerTab("template");
    setView("inbox");
    setBrowsingTemplate(null);
  };

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Conversation list ── */}
      <div className="w-full md:w-72 lg:w-80 flex flex-col border-r shrink-0"
        style={{ borderColor: BORDER, background: "#0A111B" }}>
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
            <Search size={13} style={{ color: "#8B95A7" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-[12.5px] outline-none" style={{ color: "#F5F7FA" }} />
          </div>
        </div>

        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg"
              style={{ background: filter === f ? "rgba(108,99,255,0.15)" : "transparent", color: filter === f ? "#8B85FF" : "#8B95A7" }}>
              {f}
            </button>
          ))}
        </div>

        {pages.length > 1 && (
          <div className="px-3 pb-2">
            <select value={pageFilter} onChange={e => setPageFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-[11.5px] outline-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#8B95A7" }}>
              <option value="all">All Pages</option>
              {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="w-8 h-8 rounded-full animate-pulse shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="flex-1">
                  <div className="h-3 w-28 rounded animate-pulse mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="h-2.5 w-40 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
            ))
          ) : filteredConvs.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare size={28} style={{ color: "#8B95A7", opacity: 0.3, margin: "0 auto 8px" }} />
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>
                {conversations.length === 0 ? "No conversations yet" : "No conversations found"}
              </div>
            </div>
          ) : filteredConvs.map(c => {
            const name = contactName(c.contact);
            const color = derivedPageColor(name);
            const avatar = derivedPageAvatar(name);
            const ws = windowStatus(c.contact);
            return (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                className="w-full flex items-start gap-2.5 px-3 py-3 border-b text-left"
                style={{ borderColor: "rgba(255,255,255,0.04)", background: activeId === c.id ? "rgba(108,99,255,0.07)" : "transparent" }}>
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: color }}>{avatar}</div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ borderColor: "#0A111B", background: ws === "open" ? "#10B981" : ws === "closed" ? "#F59E0B" : "#8B95A7" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[12.5px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{name}</span>
                    <span className="text-[10px] shrink-0 ml-2" style={{ color: "#8B95A7" }}>{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9.5px]" style={{ color: "rgba(108,99,255,0.7)" }}>{c.page.pageName}</span>
                    {c.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: "#6C63FF" }}>{c.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel — switches between inbox / template-browser / template-preview ── */}
      {active ? (
        <div className="hidden md:flex flex-1 flex-col min-w-0 overflow-hidden">

          {/* Shared conversation header (always visible) */}
          {view === "inbox" && (
            <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0"
              style={{ borderColor: BORDER, background: "#07090D" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: derivedPageColor(contactName(active.contact)) }}>
                {derivedPageAvatar(contactName(active.contact))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>{contactName(active.contact)}</span>
                  <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full capitalize flex items-center gap-1"
                    style={{ background: STATUS_COLORS[active.status]?.bg ?? "rgba(139,149,167,0.1)", color: STATUS_COLORS[active.status]?.color ?? "#8B95A7" }}>
                    <Circle size={5} fill="currentColor" />{active.status}
                  </span>
                  <WindowBadge contact={active.contact} />
                </div>
                <span className="text-[11px]" style={{ color: "#8B95A7" }}>{active.page.pageName}</span>
              </div>
              <div className="flex items-center gap-2">
                {active.status !== "closed" && (
                  <button onClick={closeConversation}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <CheckCircle size={12} /> Close
                  </button>
                )}
                <button onClick={() => setProfileVisible(!profileVisible)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: "#8B95A7", background: profileVisible ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.04)" }}>
                  <UserCheck size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── INBOX VIEW: messages + composer ── */}
          {view === "inbox" && (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3" style={{ background: "#07090D" }}>
                {loadingMsgs ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={16} className="animate-spin" style={{ color: "#8B95A7" }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center flex-col gap-2">
                    <MessageSquare size={28} style={{ color: "#8B95A7", opacity: 0.3 }} />
                    <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>No messages yet</div>
                  </div>
                ) : messages.map(m => (
                  <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    {m.direction === "inbound" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mr-2 mt-1"
                        style={{ background: derivedPageColor(contactName(active.contact)) }}>
                        {derivedPageAvatar(contactName(active.contact))}
                      </div>
                    )}
                    <div>
                      <div className="max-w-xs lg:max-w-md px-3.5 py-2.5 text-[13px] leading-relaxed"
                        style={m.direction === "outbound"
                          ? { background: "#6C63FF", color: "#fff", borderRadius: "14px 14px 2px 14px" }
                          : { background: "#101722", color: "#F5F7FA", borderRadius: "14px 14px 14px 2px", border: `1px solid ${BORDER}` }
                        }>
                        {m.content ?? "[attachment]"}
                      </div>
                      <div className="text-[10px] mt-1 px-1"
                        style={{ color: "#8B95A7", textAlign: m.direction === "outbound" ? "right" : "left" }}>
                        {msgTime(m.sentAt ?? m.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Composer ── */}
              <div className="px-5 pb-5 pt-3 border-t shrink-0" style={{ borderColor: BORDER, background: "#07090D" }}>
                {/* Tab switcher */}
                <div className="flex mb-3 gap-1.5">
                  <button
                    onClick={() => { setComposerTab("message"); setSelectedTemplate(null); setInput(""); setSendError(""); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                    style={{
                      background: composerTab === "message" ? "rgba(108,99,255,0.12)" : "transparent",
                      color: composerTab === "message" ? "#8B85FF" : "#8B95A7",
                      border: composerTab === "message" ? "1px solid rgba(108,99,255,0.25)" : "1px solid transparent",
                    }}>
                    <MessageSquare size={12} /> Message
                  </button>
                  <button
                    onClick={openTemplateBrowser}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                    style={{
                      background: composerTab === "template" ? "rgba(108,99,255,0.12)" : "transparent",
                      color: composerTab === "template" ? "#8B85FF" : "#8B95A7",
                      border: composerTab === "template" ? "1px solid rgba(108,99,255,0.25)" : "1px solid transparent",
                    }}>
                    <FileText size={12} /> Template
                    {selectedTemplate && composerTab === "template" && (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]"
                        style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF" }}>
                        {selectedTemplate.name}
                      </span>
                    )}
                    {activeWindow !== "open" && !selectedTemplate && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>Recommended</span>
                    )}
                  </button>
                </div>

                {/* Window closed warning — message tab */}
                {composerTab === "message" && activeWindow !== "open" && (
                  <div className="mb-2.5 flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11.5px]"
                    style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)", color: "#F59E0B" }}>
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold">24-hour window closed.</span>
                      {" "}Last message {windowAgeLabel(active.contact)}.
                      {" "}Sending may fail.{" "}
                      <button onClick={openTemplateBrowser} className="underline font-semibold">
                        Use a template
                      </button>{" "}instead.
                    </div>
                  </div>
                )}

                {/* Send error */}
                {sendError && (
                  <div className="mb-2.5 flex items-start gap-2 px-3 py-2 rounded-xl text-[12px]"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <div className="flex-1">{sendError}</div>
                    <button onClick={() => setSendError("")}><X size={12} /></button>
                  </div>
                )}

                {/* Message composer */}
                {composerTab === "message" && (
                  <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="px-4 py-3">
                      <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder={`Message ${active.contact.firstName ?? contactName(active.contact).split(" ")[0]}…`}
                        className="w-full bg-transparent text-[13.5px] outline-none resize-none"
                        style={{ color: "#F5F7FA", minHeight: 48, maxHeight: 120 }}
                        rows={2} disabled={sending}
                      />
                    </div>
                    <div className="flex items-center gap-2 px-4 pb-3">
                      <div className="flex-1 text-[11px]" style={{ color: "#8B95A7", opacity: 0.45 }}>Shift+Enter for newline</div>
                      <button onClick={sendMessage} disabled={!input.trim() || sending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white"
                        style={{ background: input.trim() && !sending ? "#6C63FF" : "rgba(108,99,255,0.3)" }}>
                        {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        {sending ? "Sending…" : "Send"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Template composer — after "Use Template" is clicked */}
                {composerTab === "template" && (
                  <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {/* Template name bar */}
                    {selectedTemplate && (
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <FileText size={12} style={{ color: "#8B85FF" }} />
                        <span className="text-[12px] font-medium flex-1 truncate" style={{ color: "#8B85FF" }}>
                          {selectedTemplate.name}
                        </span>
                        <button
                          onClick={openTemplateBrowser}
                          className="text-[11px] px-2 py-1 rounded"
                          style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                          Change
                        </button>
                        <button onClick={() => { setSelectedTemplate(null); setInput(""); setComposerTab("message"); }}>
                          <X size={12} style={{ color: "#8B95A7" }} />
                        </button>
                      </div>
                    )}
                    <div className="px-4 py-3">
                      <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Template message…"
                        className="w-full bg-transparent text-[13.5px] outline-none resize-none"
                        style={{ color: "#F5F7FA", minHeight: 64, maxHeight: 160 }}
                        rows={3} disabled={sending}
                      />
                    </div>
                    <div className="flex items-center gap-2 px-4 pb-3">
                      <div className="flex-1 text-[11px]" style={{ color: "#8B95A7", opacity: 0.45 }}>You can edit the message above before sending</div>
                      <button onClick={sendMessage} disabled={!input.trim() || sending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white"
                        style={{ background: input.trim() && !sending ? "#6C63FF" : "rgba(108,99,255,0.3)" }}>
                        {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        {sending ? "Sending…" : "Send Template"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── TEMPLATE BROWSER VIEW ── */}
          {view === "template-browser" && (
            <div className="flex-1 overflow-hidden">
              <TemplateBrowser
                templates={templates}
                loading={loadingTemplates}
                loadError={templateLoadError}
                pageName={active.page.pageName}
                onSelect={t => { setBrowsingTemplate(t); setView("template-preview"); }}
                onBack={() => setView("inbox")}
              />
            </div>
          )}

          {/* ── TEMPLATE PREVIEW VIEW ── */}
          {view === "template-preview" && browsingTemplate && (
            <div className="flex-1 overflow-hidden">
              <TemplatePreview
                template={browsingTemplate}
                contact={active.contact}
                pageName={active.page.pageName}
                windowClosed={activeWindow !== "open"}
                onUseTemplate={handleUseTemplate}
                onBack={() => setView("template-browser")}
              />
            </div>
          )}
        </div>
      ) : !loadingConvs && (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3" style={{ background: "#07090D" }}>
          <MessageSquare size={36} style={{ color: "#8B95A7", opacity: 0.3 }} />
          <div className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>No conversations yet</div>
          <div className="text-[12.5px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
            Connect a Facebook Page to start receiving messages from your audience.
          </div>
        </div>
      )}

      {/* ── Customer profile sidebar ── */}
      {active && profileVisible && view === "inbox" && (
        <div className="hidden lg:flex w-64 flex-col border-l shrink-0"
          style={{ borderColor: BORDER, background: "#0A111B" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7", opacity: 0.6 }}>Customer</span>
          </div>
          <div className="px-4 py-5 flex flex-col gap-5 overflow-y-auto">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                style={{ background: derivedPageColor(contactName(active.contact)) }}>
                {derivedPageAvatar(contactName(active.contact))}
              </div>
              <div className="text-center">
                <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{contactName(active.contact)}</div>
                <div className="text-[11px]" style={{ color: "#8B95A7" }}>via Messenger</div>
              </div>
            </div>

            <div>
              <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7", opacity: 0.55 }}>
                Messaging Window
              </div>
              <WindowBadge contact={active.contact} />
            </div>

            <div className="flex flex-col gap-4 text-[11.5px]">
              <InfoRow label="Page" value={active.page.pageName} />
              <InfoRow label="Last activity" value={timeAgo(active.lastMessageAt) || "—"} />
              {active.contact.id && <InfoRow label="Contact ID" value={active.contact.id.slice(-8)} mono />}
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7", opacity: 0.55 }}>Tags</div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>Customer</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium"
                style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>
                <Tag size={12} /> Add tag
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium"
                style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>
                <UserCheck size={12} /> Assign
              </button>
              {active.status !== "closed" && (
                <button onClick={closeConversation}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                  <CheckCircle size={12} /> Close conversation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7", opacity: 0.55 }}>{label}</div>
      <div className={mono ? "font-mono text-[10.5px]" : ""} style={{ color: "#F5F7FA" }}>{value}</div>
    </div>
  );
}
