"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, RefreshCw, MessageSquare, Users, ChevronLeft, ChevronRight, X, Circle } from "lucide-react";
import { useWorkspace, derivedPageColor, derivedPageAvatar } from "@/lib/workspace-context";

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

type ContactStatus = "eligible" | "recent" | "inactive";

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
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(diff / 3_600_000);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(diff / 86_400_000);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Contact profile drawer ────────────────────────────────────────────────────

function ProfileDrawer({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const { pages } = useWorkspace();
  const name = displayName(contact);
  const color = derivedPageColor(name);
  const avatar = derivedPageAvatar(name);
  const status = deriveStatus(contact);
  const pageName = pages.find(p => p.id === contact.pageId)?.name ?? "Unknown Page";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col"
        style={{ background: "#0A111B", borderLeft: "1px solid rgba(255,255,255,0.09)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: color }}>{avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>{name}</div>
            <div className="text-[11px]" style={{ color: "#8B95A7" }}>{pageName}</div>
          </div>
          <div className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: STATUS_COLORS[status].bg, color: STATUS_COLORS[status].color }}>
            <Circle size={5} fill="currentColor" />{status}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 text-[12.5px]">
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
                  <span key={t} className="text-[9.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF" }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t text-[11.5px]" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#8B95A7" }}>
            To message this contact, go to the Inbox and find their conversation.
          </div>
        </div>
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

  // sync page filter with workspace selection
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px]" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Circle size={5} fill="currentColor" /> {eligibleCount} eligible
            </div>
          )}
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

        {pages.length > 1 && (
          <select
            value={pageFilter}
            onChange={e => { setPageFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg text-[12.5px] outline-none cursor-pointer"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          >
            <option value="all">All Pages</option>
            {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

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
          onClick={() => { setSearch(""); setPageFilter("all"); setStatusFilter("all"); setPage(1); loadContacts(); }}
        >
          <RefreshCw size={12} /> Refresh
        </button>

        <div className="ml-auto text-[12.5px]" style={{ color: "#8B95A7" }}>
          {loading ? "Loading…" : `${filtered.length} contact${filtered.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          {["User", "Page", "Last Activity", "Status", "Action"].map(h => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7", opacity: 0.6 }}>{h}</span>
          ))}
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 border-b items-center" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                <div>
                  <div className="h-3 w-24 rounded animate-pulse mb-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="h-2.5 w-32 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
              <div className="h-3 w-20 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3 w-16 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-7 w-16 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
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
            const name = displayName(c);
            const color = derivedPageColor(name);
            const avatar = derivedPageAvatar(name);
            const status = deriveStatus(c);
            const pageName = pages.find(p => p.id === c.pageId)?.name ?? "—";
            return (
              <div
                key={c.id}
                className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 border-b items-center transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: color }}>{avatar}</div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: "#F5F7FA" }}>{name}</div>
                    <div className="text-[10.5px] truncate font-mono" style={{ color: "#8B95A7" }}>PSID: {c.metaUserId}</div>
                  </div>
                </div>
                <div className="text-[12px] truncate" style={{ color: "#8B95A7" }}>{pageName}</div>
                <div className="text-[12px]" style={{ color: "#8B95A7" }}>{formatAge(c.lastMessageAt)}</div>
                <div>
                  <span className="text-[10.5px] font-medium px-2 py-1 rounded-full capitalize" style={{ background: STATUS_COLORS[status].bg, color: STATUS_COLORS[status].color }}>
                    {status}
                  </span>
                </div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors w-fit"
                  style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF", border: "1px solid rgba(108,99,255,0.2)" }}
                  onClick={() => setSelectedContact(c)}
                >
                  <MessageSquare size={11} /> View
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
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              ><ChevronLeft size={13} /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button
                  key={i}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[12px] font-medium"
                  style={{ background: page === i + 1 ? "#6C63FF" : "rgba(255,255,255,0.04)", color: page === i + 1 ? "#fff" : "#8B95A7" }}
                  onClick={() => setPage(i + 1)}
                >{i + 1}</button>
              ))}
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              ><ChevronRight size={13} /></button>
            </div>
          </div>
        )}
      </div>

      {selectedContact && <ProfileDrawer contact={selectedContact} onClose={() => setSelectedContact(null)} />}
    </div>
  );
}
