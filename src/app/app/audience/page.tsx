"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search, RefreshCw, MessageSquare, Users, ChevronLeft, ChevronRight,
  X, Circle, Send, Loader2, Bot, UserCheck, Zap, ZapOff, Info,
} from "lucide-react";
import { useWorkspace, derivedPageColor, derivedPageAvatar } from "@/lib/workspace-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type Contact = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  metaUserId: string;
  pageId: string | null;
  lastMessageAt: string | null;
  isSubscribed: boolean;
  totalMessages: number;
  tags: string[];
  createdAt: string;
};

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  content: string | null;
  messageType: string;
  sentAt: string | null;
  createdAt: string;
};

type ConvState = {
  id: string;
  status: string;
  aiAutoReply: boolean;
  humanTakeover: boolean;
  assignedTo: string | null;
};

type ContactStatus = "eligible" | "recent" | "inactive";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ContactStatus, { bg: string; color: string }> = {
  eligible: { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
  recent:   { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
  inactive: { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
};

function deriveStatus(c: Contact): ContactStatus {
  if (!c.lastMessageAt) return "inactive";
  const age = Date.now() - new Date(c.lastMessageAt).getTime();
  if (c.isSubscribed && age < 86_400_000) return "eligible";
  if (age < 7 * 86_400_000) return "recent";
  return "inactive";
}

function displayName(c: Contact): string {
  if (c.name) return c.name;
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : `User …${c.metaUserId.slice(-4)}`;
}

function formatAge(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return min === 0 ? "0m ago" : `${min}m ago`;
  const hr = Math.floor(diff / 3_600_000);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(diff / 86_400_000);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function msgTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Chat Drawer ───────────────────────────────────────────────────────────────

function ChatDrawer({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const { pages } = useWorkspace();
  const name = displayName(contact);
  const avatarColor = derivedPageColor(name);
  const avatarText = derivedPageAvatar(name);
  const status = deriveStatus(contact);
  const pageName = pages.find(p => p.id === contact.pageId)?.name ?? "Unknown Page";

  // Panel tab: "chat" | "info"
  const [tab, setTab] = useState<"chat" | "info">("chat");

  // Conversation state
  const [conv, setConv] = useState<ConvState | null>(null);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState("");

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  // Composer
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // AI toggle state
  const [togglingAi, setTogglingAi] = useState(false);
  const [togglingHuman, setTogglingHuman] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Find/create conversation on mount ──────────────────────────────────────
  useEffect(() => {
    if (!contact.pageId) { setConvError("No page associated with this contact."); setConvLoading(false); return; }
    setConvLoading(true);
    fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.id, pageId: contact.pageId }),
    })
      .then(r => r.json())
      .then((d: { conversation?: ConvState; error?: string }) => {
        if (d.conversation) {
          setConv(d.conversation);
        } else {
          setConvError(d.error ?? "Failed to load conversation.");
        }
      })
      .catch(() => setConvError("Network error — could not load conversation."))
      .finally(() => setConvLoading(false));
  }, [contact.id, contact.pageId]);

  // ── Load messages when conversation is ready ────────────────────────────────
  const loadMessages = useCallback((convId: string) => {
    fetch(`/api/conversations/${convId}/messages?limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { messages?: Message[] } | null) => { if (d?.messages) setMessages(d.messages); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!conv) return;
    setMsgsLoading(true);
    fetch(`/api/conversations/${conv.id}/messages?limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { messages?: Message[] } | null) => { if (d?.messages) setMessages(d.messages); })
      .catch(() => {})
      .finally(() => setMsgsLoading(false));
  }, [conv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll for new messages every 8 seconds ──────────────────────────────────
  useEffect(() => {
    if (!conv) return;
    pollRef.current = setInterval(() => loadMessages(conv.id), 8_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [conv?.id, loadMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to latest message ────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || !conv) return;
    setSending(true); setSendError("");
    try {
      const res = await fetch(`/api/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      const d = await res.json() as { message?: Message; error?: string };
      if (res.ok && d.message) {
        setMessages(prev => [...prev, d.message!]);
        setInput("");
      } else {
        setSendError(d.error ?? "Failed to send message.");
      }
    } catch { setSendError("Network error. Please try again."); }
    finally { setSending(false); }
  };

  // ── Toggle AI auto-reply ────────────────────────────────────────────────────
  const toggleAiAutoReply = async () => {
    if (!conv || togglingAi) return;
    const newVal = !conv.aiAutoReply;
    setTogglingAi(true);
    try {
      const res = await fetch(`/api/conversations/${conv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // When enabling AI, also lift human takeover
        body: JSON.stringify({ aiAutoReply: newVal, ...(newVal && { humanTakeover: false, assignedTo: null }) }),
      });
      if (res.ok) {
        setConv(prev => prev ? { ...prev, aiAutoReply: newVal, ...(newVal && { humanTakeover: false, assignedTo: null }) } : prev);
      }
    } catch { /* ignore */ }
    finally { setTogglingAi(false); }
  };

  // ── Human takeover ──────────────────────────────────────────────────────────
  const takeOver = async () => {
    if (!conv || togglingHuman) return;
    setTogglingHuman(true);
    try {
      const res = await fetch(`/api/conversations/${conv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ humanTakeover: true, aiAutoReply: false, assignedTo: "human" }),
      });
      if (res.ok) setConv(prev => prev ? { ...prev, humanTakeover: true, aiAutoReply: false, assignedTo: "human" } : prev);
    } catch { /* ignore */ }
    finally { setTogglingHuman(false); }
  };

  const resumeAi = async () => {
    if (!conv || togglingHuman) return;
    setTogglingHuman(true);
    try {
      const res = await fetch(`/api/conversations/${conv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ humanTakeover: false, assignedTo: null }),
      });
      if (res.ok) setConv(prev => prev ? { ...prev, humanTakeover: false, assignedTo: null } : prev);
    } catch { /* ignore */ }
    finally { setTogglingHuman(false); }
  };

  const PANEL_BG = "#0A111B";
  const BORDER = "rgba(255,255,255,0.07)";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[480px] z-50 flex flex-col"
        style={{ background: PANEL_BG, borderLeft: `1px solid ${BORDER}` }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3.5 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5">
            <X size={15} style={{ color: "#8B95A7" }} />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: avatarColor }}>
            {avatarText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{name}</div>
            <div className="text-[11px] truncate" style={{ color: "#8B95A7" }}>{pageName}</div>
          </div>
          <div className="flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full capitalize"
            style={{ background: STATUS_COLORS[status].bg, color: STATUS_COLORS[status].color }}>
            <Circle size={5} fill="currentColor" /> {status}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {(["chat", "info"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors"
              style={{
                color: tab === t ? "#8B85FF" : "#8B95A7",
                borderBottom: tab === t ? "2px solid #6C63FF" : "2px solid transparent",
              }}>
              {t === "chat" ? <MessageSquare size={12} /> : <Info size={12} />}
              {t === "chat" ? "Chat" : "Contact Info"}
            </button>
          ))}
        </div>

        {/* ── Chat tab ── */}
        {tab === "chat" && (
          <>
            {/* AI / Human control bar */}
            {conv && (
              <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.015)" }}>
                {/* AI Auto Reply toggle */}
                <div className="flex items-center gap-2 flex-1">
                  <Bot size={13} style={{ color: conv.aiAutoReply ? "#10B981" : "#8B95A7" }} />
                  <span className="text-[11.5px]" style={{ color: "#8B95A7" }}>AI Auto Reply</span>
                  <button
                    onClick={toggleAiAutoReply}
                    disabled={togglingAi}
                    className="relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 shrink-0"
                    style={{ background: conv.aiAutoReply ? "#10B981" : "rgba(255,255,255,0.1)" }}
                    title={conv.aiAutoReply ? "Turn off AI auto-reply" : "Turn on AI auto-reply"}
                  >
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                      style={{ transform: conv.aiAutoReply ? "translateX(16px)" : "translateX(0)" }} />
                  </button>
                  {conv.aiAutoReply && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>ON</span>
                  )}
                </div>

                {/* Human Takeover / Resume AI */}
                {conv.humanTakeover ? (
                  <button
                    onClick={resumeAi}
                    disabled={togglingHuman}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                    style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.25)" }}>
                    {togglingHuman ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                    Resume AI
                  </button>
                ) : (
                  <button
                    onClick={takeOver}
                    disabled={togglingHuman}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                    style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>
                    {togglingHuman ? <Loader2 size={10} className="animate-spin" /> : <UserCheck size={10} />}
                    Take Over
                  </button>
                )}
              </div>
            )}

            {/* Status banners */}
            {conv?.humanTakeover && (
              <div className="mx-4 mt-2 shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-[11.5px]"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
                <UserCheck size={12} /> Human agent active — AI auto-reply paused for this conversation.
              </div>
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ background: "#07090D" }}>
              {convLoading ? (
                <div className="flex-1 flex items-center justify-center gap-2" style={{ color: "#8B95A7" }}>
                  <Loader2 size={14} className="animate-spin" /> Loading conversation…
                </div>
              ) : convError ? (
                <div className="flex-1 flex items-center justify-center flex-col gap-2">
                  <MessageSquare size={28} style={{ color: "#8B95A7", opacity: 0.3 }} />
                  <p className="text-[12.5px] text-center" style={{ color: "#8B95A7" }}>{convError}</p>
                </div>
              ) : msgsLoading ? (
                <div className="flex-1 flex items-center justify-center gap-2" style={{ color: "#8B95A7" }}>
                  <Loader2 size={14} className="animate-spin" /> Loading messages…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center flex-col gap-2">
                  <MessageSquare size={28} style={{ color: "#8B95A7", opacity: 0.3 }} />
                  <p className="text-[12.5px]" style={{ color: "#8B95A7" }}>No messages yet</p>
                  <p className="text-[11px]" style={{ color: "#8B95A7", opacity: 0.6 }}>Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    {m.direction === "inbound" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mr-2 mt-1"
                        style={{ background: avatarColor }}>{avatarText}</div>
                    )}
                    <div>
                      <div className="max-w-[280px] px-3.5 py-2.5 text-[13px] leading-relaxed"
                        style={m.direction === "outbound"
                          ? { background: "#6C63FF", color: "#fff", borderRadius: "14px 14px 2px 14px" }
                          : { background: "#101722", color: "#F5F7FA", borderRadius: "14px 14px 14px 2px", border: "1px solid rgba(255,255,255,0.07)" }
                        }>
                        {m.content ?? "[attachment]"}
                      </div>
                      <div className="text-[10px] mt-1 px-1" style={{ color: "#8B95A7", textAlign: m.direction === "outbound" ? "right" : "left" }}>
                        {msgTime(m.sentAt ?? m.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            {!convLoading && !convError && (
              <div className="px-4 pb-4 pt-3 shrink-0" style={{ borderTop: `1px solid ${BORDER}`, background: "#07090D" }}>
                {sendError && (
                  <div className="mb-2 px-3 py-2 rounded-lg text-[11.5px]"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                    {sendError}
                  </div>
                )}
                <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="px-4 py-3">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={`Message ${contact.firstName ?? name.split(" ")[0]}…`}
                      className="w-full bg-transparent text-[13.5px] outline-none"
                      style={{ color: "#F5F7FA" }}
                      disabled={sending}
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 pb-3">
                    <div className="flex-1 text-[11px]" style={{ color: "#8B95A7", opacity: 0.5 }}>
                      Enter to send
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || sending || !conv}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold text-white transition-all"
                      style={{ background: (input.trim() && !sending && conv) ? "#6C63FF" : "rgba(108,99,255,0.3)" }}>
                      {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>

                {/* AI indicator in composer */}
                {conv?.aiAutoReply && !conv.humanTakeover && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10.5px]" style={{ color: "#10B981" }}>
                    <Bot size={10} />
                    AI is active — will auto-reply to incoming messages
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Info tab ── */}
        {tab === "info" && (
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 text-[12.5px]">
            {/* Avatar + name */}
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: avatarColor }}>
                {avatarText}
              </div>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{name}</div>
                <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{pageName}</div>
              </div>
            </div>

            {[
              { label: "PSID / Meta User ID", value: contact.metaUserId, mono: true },
              { label: "Page",                value: pageName },
              { label: "Joined",              value: new Date(contact.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
              { label: "Last activity",       value: formatAge(contact.lastMessageAt) },
              { label: "Total messages",      value: contact.totalMessages.toString() },
              { label: "Subscribed",          value: contact.isSubscribed ? "Yes" : "No" },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7", opacity: 0.55 }}>{label}</div>
                <div className={mono ? "font-mono text-[11px]" : ""} style={{ color: "#F5F7FA" }}>{value}</div>
              </div>
            ))}

            {contact.tags.length > 0 && (
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7", opacity: 0.55 }}>Tags</div>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map(t => (
                    <span key={t} className="text-[9.5px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* AI controls in info tab too */}
            {conv && (
              <div className="pt-4 flex flex-col gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                <div className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7", opacity: 0.55 }}>Conversation Controls</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot size={13} style={{ color: conv.aiAutoReply ? "#10B981" : "#8B95A7" }} />
                    <span className="text-[12px]" style={{ color: "#C4CDD8" }}>AI Auto Reply</span>
                  </div>
                  <button
                    onClick={toggleAiAutoReply}
                    disabled={togglingAi}
                    className="relative inline-flex h-5 w-9 rounded-full transition-colors duration-200"
                    style={{ background: conv.aiAutoReply ? "#10B981" : "rgba(255,255,255,0.1)" }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                      style={{ transform: conv.aiAutoReply ? "translateX(16px)" : "translateX(0)" }} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck size={13} style={{ color: conv.humanTakeover ? "#F59E0B" : "#8B95A7" }} />
                    <span className="text-[12px]" style={{ color: "#C4CDD8" }}>Human Takeover</span>
                  </div>
                  {conv.humanTakeover ? (
                    <button onClick={resumeAi} disabled={togglingHuman}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                      style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.2)" }}>
                      <Zap size={10} /> Resume AI
                    </button>
                  ) : (
                    <button onClick={takeOver} disabled={togglingHuman}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <UserCheck size={10} /> Take Over
                    </button>
                  )}
                </div>
                {conv.humanTakeover && (
                  <p className="text-[11px] leading-relaxed" style={{ color: "#F59E0B", opacity: 0.8 }}>
                    You are managing this conversation. AI auto-reply is paused.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PER_PAGE = 8;

export default function AudiencePage() {
  const { selectedPageId, pages } = useWorkspace();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageFilter, setPageFilter] = useState(selectedPageId ?? "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [page, setPage] = useState(1);

  const loadContacts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (pageFilter !== "all") params.set("pageId", pageFilter);
    if (search) params.set("search", search);
    fetch(`/api/contacts?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { contacts?: Contact[] } | null) => { if (d?.contacts) setContacts(d.contacts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageFilter, search]);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { setPageFilter(selectedPageId ?? "all"); }, [selectedPageId]);

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const status = deriveStatus(c);
      return statusFilter === "all" || status === statusFilter;
    });
  }, [contacts, statusFilter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const eligibleCount = contacts.filter(c => deriveStatus(c) === "eligible").length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Audience</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>
            {pageFilter !== "all"
              ? `Showing audience for ${pages.find(p => p.id === pageFilter)?.name ?? "selected page"}`
              : "Manage and organize your customer audience across all pages."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {eligibleCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px]"
              style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Circle size={5} fill="currentColor" /> {eligibleCount} eligible
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs px-3 py-2 rounded-lg"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Search size={13} style={{ color: "#8B95A7" }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or PSID..."
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: "#F5F7FA" }}
          />
        </div>

        {pages.length > 1 && (
          <select value={pageFilter} onChange={e => { setPageFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg text-[12.5px] outline-none cursor-pointer"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}>
            <option value="all">All Pages</option>
            {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-[12.5px] outline-none cursor-pointer"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}>
          <option value="all">All Statuses</option>
          <option value="eligible">Eligible</option>
          <option value="recent">Recent</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] transition-colors"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}
          onClick={() => { setSearch(""); setPageFilter("all"); setStatusFilter("all"); setPage(1); loadContacts(); }}>
          <RefreshCw size={12} /> Refresh
        </button>

        <div className="ml-auto text-[12.5px]" style={{ color: "#8B95A7" }}>
          {loading ? "Loading…" : `${filtered.length} contact${filtered.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_120px] gap-4 px-5 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          {["User", "Page", "Last Activity", "Status", "Action"].map(h => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "#8B95A7", opacity: 0.6 }}>{h}</span>
          ))}
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_120px] gap-4 px-5 py-3.5 border-b items-center"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full animate-pulse shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div>
                  <div className="h-3 w-24 rounded animate-pulse mb-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="h-2.5 w-32 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
              <div className="h-3 w-20 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3 w-16 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-7 w-24 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
          ))
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} style={{ color: "#8B95A7", opacity: 0.3, margin: "0 auto 12px" }} />
            <div className="text-[14px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>
              {contacts.length === 0 ? "No audience yet" : "No contacts found"}
            </div>
            <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>
              {contacts.length === 0
                ? "Connect a Facebook Page to start building your audience."
                : "Try adjusting your search or filters."}
            </div>
          </div>
        ) : (
          paginated.map(c => {
            const cname = displayName(c);
            const color = derivedPageColor(cname);
            const avatar = derivedPageAvatar(cname);
            const cstatus = deriveStatus(c);
            const pname = pages.find(p => p.id === c.pageId)?.name ?? "—";
            return (
              <div key={c.id}
                className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_120px] gap-4 px-5 py-3.5 border-b items-center transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: color }}>
                    {avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{cname}</div>
                    <div className="text-[10.5px] truncate font-mono" style={{ color: "#8B95A7" }}>PSID: {c.metaUserId}</div>
                  </div>
                </div>
                <div className="text-[12px] truncate" style={{ color: "#8B95A7" }}>{pname}</div>
                <div className="text-[12px]" style={{ color: "#8B95A7" }}>{formatAge(c.lastMessageAt)}</div>
                <div>
                  <span className="text-[10.5px] font-medium px-2 py-1 rounded-full capitalize"
                    style={{ background: STATUS_COLORS[cstatus].bg, color: STATUS_COLORS[cstatus].color }}>
                    {cstatus}
                  </span>
                </div>
                {/* Chat button */}
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors w-fit"
                  style={{ background: "rgba(108,99,255,0.12)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.25)" }}
                  onClick={() => setSelectedContact(c)}>
                  <MessageSquare size={11} /> Chat
                </button>
              </div>
            );
          })
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[12px]" style={{ color: "#8B95A7" }}>
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button key={i}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[12px] font-medium"
                  style={{ background: page === i + 1 ? "#6C63FF" : "rgba(255,255,255,0.04)", color: page === i + 1 ? "#fff" : "#8B95A7" }}
                  onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat drawer */}
      {selectedContact && <ChatDrawer contact={selectedContact} onClose={() => setSelectedContact(null)} />}
    </div>
  );
}

// Suppress unused import warning — ZapOff is available for future use
void ZapOff;
