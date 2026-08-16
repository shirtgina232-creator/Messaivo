"use client";

import { useState } from "react";
import {
  Search, Circle, Send, Paperclip, Smile, FileText,
  X, Tag, UserCheck, CheckCircle, ChevronRight, MessageSquare,
} from "lucide-react";
import { DEMO_CONVERSATIONS, DEMO_PAGES, type Conversation, type Message } from "@/lib/demo-data";
import { useWorkspace } from "@/lib/workspace-context";

const STATUS_COLORS = {
  open:     { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
  assigned: { bg: "rgba(108,99,255,0.1)",  color: "#8B85FF" },
  closed:   { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
};

const FILTERS = ["All", "Unread", "Open", "Assigned", "Closed"];

export default function InboxPage() {
  const { selectedPageId, connectedPageIds } = useWorkspace();
  const [conversations, setConversations] = useState<Conversation[]>(DEMO_CONVERSATIONS);
  const [activeId, setActiveId] = useState(DEMO_CONVERSATIONS[0].id);
  const [filter, setFilter] = useState("All");
  const [pageFilter, setPageFilter] = useState(selectedPageId ?? "all");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [profileVisible, setProfileVisible] = useState(true);

  const connectedPages = DEMO_PAGES.filter(p => connectedPageIds.includes(p.id));
  const active = conversations.find(c => c.id === activeId)!;

  const filtered = conversations.filter(c => {
    const matchSearch = !search || c.customerName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" ? true
      : filter === "Unread" ? c.unread > 0
      : filter.toLowerCase() === c.status;
    const matchPage = pageFilter === "all" || c.pageId === pageFilter;
    return matchSearch && matchFilter && matchPage;
  });

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: String(Date.now()),
      role: "agent",
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setConversations(prev =>
      prev.map(c =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, newMsg], lastMessage: input.trim(), time: "now" }
          : c
      )
    );
    setInput("");
  };

  const closeConversation = () => {
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, status: "closed" as const } : c));
  };

  const activeCustomer = { psid: "45218910234", joined: "Jun 12, 2025", tag: "VIP", convos: 12 };

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 64px)" }}>
      {/* Conversation list */}
      <div className="w-full md:w-72 lg:w-80 flex flex-col border-r shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0A111B" }}>
        {/* Search */}
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

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: filter === f ? "rgba(108,99,255,0.15)" : "transparent",
                color: filter === f ? "#8B85FF" : "#8B95A7",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Page filter */}
        {connectedPages.length > 1 && (
          <div className="px-3 pb-2">
            <select
              value={pageFilter}
              onChange={e => setPageFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-[11.5px] outline-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#8B95A7" }}
            >
              <option value="all">All Pages</option>
              {connectedPages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[12.5px]" style={{ color: "#8B95A7" }}>No conversations found</div>
          ) : filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className="w-full flex items-start gap-2.5 px-3 py-3 border-b text-left transition-colors"
              style={{
                borderColor: "rgba(255,255,255,0.04)",
                background: activeId === c.id ? "rgba(108,99,255,0.07)" : "transparent",
              }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: c.color }}>{c.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[12.5px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{c.customerName}</span>
                  <span className="text-[10px] shrink-0 ml-2" style={{ color: "#8B95A7" }}>{c.time}</span>
                </div>
                <p className="text-[11.5px] truncate" style={{ color: "#8B95A7" }}>{c.lastMessage}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9.5px]" style={{ color: "rgba(108,99,255,0.7)" }}>{c.pageName}</span>
                  {c.unread > 0 && (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#6C63FF" }}>{c.unread}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation panel */}
      <div className="hidden md:flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#07090D" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: active.color }}>{active.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>{active.customerName}</span>
              <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full capitalize flex items-center gap-1"
                style={{ background: STATUS_COLORS[active.status].bg, color: STATUS_COLORS[active.status].color }}>
                <Circle size={5} fill="currentColor" />{active.status}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "#8B95A7" }}>{active.pageName}</span>
          </div>
          <div className="flex items-center gap-2">
            {active.status !== "closed" && (
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors"
                style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}
                onClick={closeConversation}
              >
                <CheckCircle size={12} /> Close
              </button>
            )}
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#8B95A7", background: profileVisible ? "rgba(108,99,255,0.12)" : "rgba(255,255,255,0.04)" }}
              onClick={() => setProfileVisible(!profileVisible)}
            >
              <UserCheck size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3" style={{ background: "#07090D" }}>
          {active.messages.map(m => (
            <div key={m.id} className={`flex ${m.role === "agent" ? "justify-end" : "justify-start"}`}>
              {m.role === "customer" && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mr-2 mt-1" style={{ background: active.color }}>{active.avatar}</div>
              )}
              <div>
                <div
                  className="max-w-xs lg:max-w-md px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={m.role === "agent"
                    ? { background: "#6C63FF", color: "#fff", borderRadius: "14px 14px 2px 14px" }
                    : { background: "#101722", color: "#F5F7FA", borderRadius: "14px 14px 14px 2px", border: "1px solid rgba(255,255,255,0.07)" }
                  }
                >
                  {m.text}
                </div>
                <div className="text-[10px] mt-1 px-1" style={{ color: "#8B95A7", textAlign: m.role === "agent" ? "right" : "left" }}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="px-5 pb-5 pt-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#07090D" }}>
          <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-4 py-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Message ${active.customerName.split(" ")[0]}…`}
                className="w-full bg-transparent text-[13.5px] outline-none"
                style={{ color: "#F5F7FA" }}
              />
            </div>
            <div className="flex items-center gap-2 px-4 pb-3">
              <button className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                <Paperclip size={13} />
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                <Smile size={13} />
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}>
                <FileText size={13} />
              </button>
              <div className="flex-1" />
              <button
                onClick={sendMessage}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white transition-all"
                style={{ background: input.trim() ? "#6C63FF" : "rgba(108,99,255,0.3)" }}
              >
                <Send size={13} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer profile */}
      {profileVisible && (
        <div className="hidden lg:flex w-64 flex-col border-l shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0A111B" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7", opacity: 0.6 }}>Customer</span>
          </div>
          <div className="px-4 py-5 flex flex-col gap-5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-[13px] font-bold text-white" style={{ background: active.color }}>{active.avatar}</div>
              <div className="text-center">
                <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{active.customerName}</div>
                <div className="text-[11px]" style={{ color: "#8B95A7" }}>via Messenger</div>
              </div>
            </div>

            <div className="flex flex-col gap-4 text-[11.5px]">
              <Row label="PSID" value={activeCustomer.psid} mono />
              <Row label="Page" value={active.pageName} />
              <Row label="Joined" value={activeCustomer.joined} />
              <Row label="Conversations" value={String(activeCustomer.convos)} />
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B95A7", opacity: 0.55 }}>Tags</div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>{activeCustomer.tag}</span>
                  <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>Customer</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium transition-colors" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>
                <Tag size={12} /> Add tag
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium transition-colors" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}>
                <UserCheck size={12} /> Assign
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
                onClick={closeConversation}
              >
                <CheckCircle size={12} /> Close conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[9.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8B95A7", opacity: 0.55 }}>{label}</div>
      <div className={`${mono ? "font-mono text-[10.5px]" : ""}`} style={{ color: "#F5F7FA" }}>{value}</div>
    </div>
  );
}
