"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";

type CreditLedger = { monthlyAllocation: number; usedThisPeriod: number } | null;
type Workspace = { id: string; name: string; planId: string; creditLedger: CreditLedger } | null;
type User = {
  id: string; email: string; name: string | null; role: string; status: string; createdAt: Date;
  workspace: Workspace;
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "#EF4444", ADMIN: "#F97316", SUPPORT: "#3B82F6", FINANCE: "#10B981", USER: "#8B95A7",
};
const ALL_ROLES = ["ALL", "USER", "ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"];
const ALL_STATUSES = ["ALL", "ACTIVE", "SUSPENDED"];

function StatusBadge({ status }: { status: string }) {
  const color = status === "ACTIVE" ? "#10B981" : "#EF4444";
  const bg = status === "ACTIVE" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color, background: bg }}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? "#8B95A7";
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color, background: `${color}18` }}>
      {role.replace("_", " ")}
    </span>
  );
}

export default function UsersManager({ initialUsers }: { initialUsers: User[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      if (q && !u.name?.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  async function toggleStatus(userId: string, currentStatus: string) {
    const action = currentStatus === "SUSPENDED" ? "activate" : "suspend";
    setLoading(userId + "-status");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const { status } = await res.json();
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status } : u));
      }
    } finally {
      setLoading(null);
    }
  }

  async function changeRole(userId: string, newRole: string) {
    setLoading(userId + "-role");
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        const { user } = await res.json();
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: user.role } : u));
      }
    } finally {
      setLoading(null);
    }
  }

  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
          <input
            className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg text-[12.5px] outline-none"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {ALL_ROLES.map((r) => <option key={r} value={r}>{r === "ALL" ? "All Roles" : r.replace("_", " ")}</option>)}
        </select>
        <select
          className="px-3 py-2 rounded-lg text-[12.5px] outline-none"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>)}
        </select>
        <div className="text-[12px] ml-auto" style={{ color: "#8B95A7" }}>{filtered.length} user{filtered.length !== 1 ? "s" : ""}</div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="grid gap-3 px-5 py-3 border-b"
          style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          {["Name / Email", "Workspace", "Plan", "Role", "Status", "Joined", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No users match your filters.</div>
        )}
        {filtered.map((u) => (
          <div
            key={u.id}
            className="grid gap-3 px-5 py-3.5 border-b last:border-0 items-center"
            style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr auto", borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: `${ROLE_COLORS[u.role] ?? "#8B95A7"}22`, color: ROLE_COLORS[u.role] ?? "#8B95A7" }}>
                {(u.name ?? u.email)[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>{u.name ?? "—"}</div>
                <div className="text-[11px] truncate" style={{ color: "#8B95A7" }}>{u.email}</div>
              </div>
            </div>
            <div className="text-[12.5px] truncate" style={{ color: "#8B95A7" }}>{u.workspace?.name ?? "—"}</div>
            <div className="text-[12px]" style={{ color: "#8B95A7" }}>{u.workspace?.planId ?? "—"}</div>
            <div><RoleBadge role={u.role} /></div>
            <div><StatusBadge status={u.status} /></div>
            <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{fmt.format(new Date(u.createdAt))}</div>
            <div className="flex items-center gap-2">
              <select
                className="text-[11px] px-2 py-1 rounded outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                value={u.role}
                onChange={(e) => changeRole(u.id, e.target.value)}
                disabled={loading === u.id + "-role"}
              >
                {["USER", "ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"].map((r) => (
                  <option key={r} value={r}>{r.replace("_", " ")}</option>
                ))}
              </select>
              <button
                onClick={() => toggleStatus(u.id, u.status)}
                disabled={loading === u.id + "-status"}
                className="text-[11px] px-2.5 py-1 rounded font-medium transition-colors"
                style={{
                  background: u.status === "SUSPENDED" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  color: u.status === "SUSPENDED" ? "#10B981" : "#EF4444",
                  border: `1px solid ${u.status === "SUSPENDED" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                  opacity: loading === u.id + "-status" ? 0.5 : 1,
                }}
              >
                {u.status === "SUSPENDED" ? "Activate" : "Suspend"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
