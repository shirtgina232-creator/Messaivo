"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Circle, Send, Paperclip, Smile, FileText,
  X, Tag, UserCheck, CheckCircle, MessageSquare,
} from "lucide-react";
import { useWorkspace, derivedPageColor, derivedPageAvatar } from "@/lib/workspace-context";

// ── Types ──────────────────────────────────────────────────────────────────────

type ConvContact = { id: string; name: string | null; firstName: string | null; lastName: string | null; profilePicUrl: string | null };
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
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [profileVisible, setProfileVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const loadConversations = useCallback(() => {
    setLoadingConvs(true);
    const params = new URLSearchParams({ limit: "50" });
    if (pageFilter !== "all") params.set("pageId", pageFilter);
    fetch(`/api/conversations?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { conversations?: Conversation[] } | null) => {
        if (d?.conversations) {
          setConversations(d.conversations);
          if (d.conversations.length > 0 && !activeId) {
            setActiveId(d.conversations[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, [pageFilter, activeId]);

  useEffect(() => { loadConversations(); }, [pageFilter]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    fetch(`/api/conversations/${activeId}/messages?limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { messages?: Message[] } | null) => { if (d?.messages) setMessages(d.messages); })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filtered = conversations.filter(c => {
    const name = contactName(c.contact);
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" ? true
      : filter === "Unread" ? c.unreadCount > 0
      : filter.toLowerCase() === c.status;
    const matchPage = pageFilter === "all" || c.page.id === pageFilter;
    return matchSearch && matchFilter && matchPage;
  });

  const active = conversations.find(c => c.id === activeId);

  const sendMessage = async () => {
    if (!input.trim() || !activeId) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (res.ok) {
        const d = await res.json() as { message?: Message };
        if (d.message) setMessages(prev => [...prev, d.message!]);
        setConversations(prev => prev.map(c =>
          c.id === activeId ? { ...c, lastMessageAt: new Date().toISOString() } : c
        ));
        setInput("");
      } else {
        const d = await res.json() as { error?: string };
        setSendError(d.error ?? "Failed to send message.");
      }
    } catch {
      setSendError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
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

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Conversation list ── */}
      <div className="w-full md:w-72 lg:w-80 flex flex-col border-r shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0A111B" }}>
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Search size={13} style={{ color: "#8B95A7" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-[12.5px] outline-none"
              style={{ color: "#F5F7FA" }}
            />
          </div>
        </div>

        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all"
              style={{ background: filter === f ? "rgba(108,99,255,0.15)" : "transparent", color: filter === f ? "#8B85FF" : "#8B95A7" }}>
              {f}
            </button>
          ))}
        </div>

        {pages.length > 1 && (
          <div className="px-3 pb-2">
            <select
              value={pageFilter}
              onChange={e => setPageFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-[11.5px] outline-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#8B95A7" }}
            >
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
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare size={28} style={{ color: "#8B95A7", opacity: 0.3, margin: "0 auto 8px" }} />
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>
                {conversations.length === 0 ? "No conversations yet" : "No conversations found"}
              </div>
            </div>
          ) : filtered.map(c => {
            const name = contactName(c.contact);
            const color = derivedPageColor(name);
            const avatar = derivedPageAvatar(name);
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="w-full flex items-start gap-2.5 px-3 py-3 border-b text-left transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.04)", background: activeId === c.id ? "rgba(108,99,255,0.07)" : "transparent" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: color }}>{avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[12.5px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{name}</span>
                    <span className="text-[10px] shrink-0 ml-2" style={{ color: "#8B95A7" }}>{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9.5px]" style={{ color: "rgba(108,99,255,0.7)" }}>{c.page.pageName}</span>
                    {c.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#6C63FF" }}>{c.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Conversation panel ── */}
      {active ? (
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#07090D" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: derivedPageColor(contactName(active.contact)) }}>
              {derivedPageAvatar(contactName(active.contact))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>{contactName(active.contact)}</span>
                <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full capitalize flex items-center gap-1"
                  style={{ background: STATUS_COLORS[active.status]?.bg ?? "rgba(139,149,167,0.1)", color: STATUS_COLORS[active.status]?.color ?? "#8B95A7" }}>
                  <Circle size={5} fill="currentColor" />{active.status}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: "#8B95A7" }}>{active.page.pageName}</span>
            </div>
            <div className="flex items-center gap-2">
              {active.status !== "closed" && (
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}
                  onClick={closeConversation}
                >
                  <CheckCircle size={12} /> Close
                </button>
              )}
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ color: "#8B95A7", background: profileVisible ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.04)" }}
                onClick={() => setProfileVisible(!profileVisible)}
              >
                <UserCheck size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3" style={{ background: "#07090D" }}>
            {loadingMsgs ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>Loading messages…</div>
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
                  <div
                    className="max-w-xs lg:max-w-md px-3.5 py-2.5 text-[13px] leading-relaxed"
                    style={m.direction === "outbound"
                      ? { background: "#6C63FF", color: "#fff", borderRadius: "14px 14px 2px 14px" }
                      : { background: "#101722", color: "#F5F7FA", borderRadius: "14px 14px 14px 2px", border: "1px solid rgba(255,255,255,0.07)" }
                    }
                  >
                    {m.content ?? "[attachment]"}
                  </div>
                  <div className="text-[10px] mt-1 px-1" style={{ color: "#8B95A7", textAlign: m.direction === "outbound" ? "right" : "left" }}>
                    {msgTime(m.sentAt ?? m.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="px-5 pb-5 pt-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#07090D" }}>
            {sendError && (
              <div className="mb-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                {sendError}
              </div>
            )}
            <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="px-4 py-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={`Message ${active.contact.firstName ?? contactName(active.contact).split(" ")[0]}…`}
                  className="w-full bg-transparent text-[13.5px] outline-none"
                  style={{ color: "#F5F7FA" }}
                  disabled={sending}
                />
              </div>
              <div className="flex items-center gap-2 px-4 pb-3">
                <button className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                  <Paperclip size={13} />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                  <Smile size={13} />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                  <FileText size={13} />
                </button>
                <div className="flex-1" />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white transition-all"
                  style={{ background: input.trim() && !sending ? "#6C63FF" : "rgba(108,99,255,0.3)" }}
                >
                  <Send size={13} /> {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
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
      {active && profileVisible && (
        <div className="hidden lg:flex w-64 flex-col border-l shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0A111B" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
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
              <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>
                <Tag size={12} /> Add tag
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>
                <UserCheck size={12} /> Assign
              </button>
              {active.status !== "closed" && (
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
                  onClick={closeConversation}
                >
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
