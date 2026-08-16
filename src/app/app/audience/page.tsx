"use client";

import { useState, useMemo } from "react";
import { Search, RefreshCw, MessageSquare, Users, ChevronLeft, ChevronRight, X, Send, Circle } from "lucide-react";
import { DEMO_CUSTOMERS, DEMO_PAGES, type Customer } from "@/lib/demo-data";
import { useWorkspace } from "@/lib/workspace-context";

const STATUS_COLORS = {
  eligible: { bg: "rgba(16,185,129,0.1)", color: "#10B981" },
  recent:   { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  inactive: { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
};

// ── Chat Drawer ───────────────────────────────────────────────────────────────

function ChatDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [messages, setMessages] = useState([
    { id: "1", role: "customer" as const, text: `Hi! I wanted to get in touch with you.`, time: "10:30 AM" },
    { id: "2", role: "agent" as const, text: `Hi ${customer.firstName}! Thanks for reaching out. How can we help?`, time: "10:31 AM" },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: String(prev.length + 1), role: "agent", text: input.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setInput("");
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col"
        style={{ background: "#0A111B", borderLeft: "1px solid rgba(255,255,255,0.09)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: customer.color }}>{customer.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>{customer.name}</div>
            <div className="text-[11px]" style={{ color: "#8B95A7" }}>{customer.pageName}</div>
          </div>
          <div className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: STATUS_COLORS[customer.status].bg, color: STATUS_COLORS[customer.status].color }}>
            <Circle size={5} fill="currentColor" />{customer.status}
          </div>
        </div>

        {/* Customer info strip */}
        <div className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
          <div className="text-[11px]" style={{ color: "#8B95A7" }}>PSID: <span style={{ color: "#F5F7FA" }}>{customer.psid}</span></div>
          <div className="text-[11px]" style={{ color: "#8B95A7" }}>Joined: <span style={{ color: "#F5F7FA" }}>{customer.joined}</span></div>
          <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>{customer.tag}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === "agent" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] px-3 py-2 rounded-xl text-[12.5px] leading-relaxed"
                style={m.role === "agent"
                  ? { background: "#6C63FF", color: "#fff", borderRadius: "12px 12px 2px 12px" }
                  : { background: "rgba(255,255,255,0.06)", color: "#F5F7FA", borderRadius: "12px 12px 12px 2px" }
                }
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="p-4 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={`Message ${customer.firstName}…`}
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: "#F5F7FA" }}
            />
            <button
              onClick={send}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
              style={{ background: input.trim() ? "#6C63FF" : "rgba(255,255,255,0.06)" }}
            >
              <Send size={12} style={{ color: input.trim() ? "#fff" : "#8B95A7" }} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AudiencePage() {
  const { selectedPageId, connectedPageIds } = useWorkspace();
  const [search, setSearch] = useState("");
  const [pageFilter, setPageFilter] = useState(selectedPageId ?? "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const connectedPages = DEMO_PAGES.filter(p => connectedPageIds.includes(p.id));
  const [chatCustomer, setChatCustomer] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  const filtered = useMemo(() => {
    return DEMO_CUSTOMERS.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.psid.includes(search);
      const matchPage = pageFilter === "all" || c.pageId === pageFilter;
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchPage && matchStatus;
    });
  }, [search, pageFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const eligibleCount = DEMO_CUSTOMERS.filter(c => c.status === "eligible").length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Audience</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>
            {pageFilter !== "all" ? `Showing audience for ${connectedPages.find(p => p.id === pageFilter)?.name ?? "selected page"}` : "Manage and organize your customer audience across all pages."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px]" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Circle size={5} fill="currentColor" /> {eligibleCount} eligible
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs px-3 py-2 rounded-lg" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Search size={13} style={{ color: "#8B95A7" }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or PSID..."
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: "#F5F7FA" }}
          />
        </div>

        <select
          value={pageFilter}
          onChange={e => { setPageFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-[12.5px] outline-none cursor-pointer"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
        >
          <option value="all">All Pages</option>
          {connectedPages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-[12.5px] outline-none cursor-pointer"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
        >
          <option value="all">All Statuses</option>
          <option value="eligible">Eligible</option>
          <option value="recent">Recent</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] transition-colors"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}
          onClick={() => { setSearch(""); setPageFilter("all"); setStatusFilter("all"); setPage(1); }}
        >
          <RefreshCw size={12} /> Refresh
        </button>

        <div className="ml-auto text-[12.5px]" style={{ color: "#8B95A7" }}>
          {filtered.length} customer{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          {["User", "Page", "Last Activity", "Status", "Action"].map(h => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7", opacity: 0.6 }}>{h}</span>
          ))}
        </div>

        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} style={{ color: "#8B95A7", opacity: 0.3, margin: "0 auto 12px" }} />
            <div className="text-[14px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>No customers found</div>
            <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>Try adjusting your search or filters.</div>
          </div>
        ) : (
          paginated.map(c => (
            <div
              key={c.id}
              className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 border-b items-center transition-colors hover:bg-[rgba(255,255,255,0.02)]"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: c.color }}>{c.avatar}</div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{c.name}</div>
                  <div className="text-[10.5px] truncate font-mono" style={{ color: "#8B95A7" }}>PSID: {c.psid}</div>
                </div>
              </div>
              <div className="text-[12px] truncate" style={{ color: "#8B95A7" }}>{c.pageName}</div>
              <div className="text-[12px]" style={{ color: "#8B95A7" }}>{c.lastActivity}</div>
              <div>
                <span className="text-[10.5px] font-medium px-2 py-1 rounded-full capitalize" style={{ background: STATUS_COLORS[c.status].bg, color: STATUS_COLORS[c.status].color }}>
                  {c.status}
                </span>
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors w-fit"
                style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.2)" }}
                onClick={() => setChatCustomer(c)}
              >
                <MessageSquare size={11} /> Chat
              </button>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[12px]" style={{ color: "#8B95A7" }}>
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[12px] font-medium transition-colors"
                  style={{ background: page === i + 1 ? "#6C63FF" : "rgba(255,255,255,0.04)", color: page === i + 1 ? "#fff" : "#8B95A7" }}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {chatCustomer && <ChatDrawer customer={chatCustomer} onClose={() => setChatCustomer(null)} />}
    </div>
  );
}
