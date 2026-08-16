"use client";

import { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";

type AdminUser = { id: string; email: string; name: string | null; role: string; createdAt: Date };

const ROLES = ["USER", "SUPPORT", "FINANCE", "ADMIN", "SUPER_ADMIN"] as const;
const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  SUPER_ADMIN: { color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  ADMIN:       { color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  SUPPORT:     { color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  FINANCE:     { color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  USER:        { color: "#8B95A7", bg: "rgba(139,149,167,0.12)" },
};

export default function RolesManager({ adminUsers, currentUserId, totalUsers }: {
  adminUsers: AdminUser[]; currentUserId: string; totalUsers: number;
}) {
  const [users, setUsers] = useState<AdminUser[]>(adminUsers);
  const [search, setSearch] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promotingRole, setPromotingRole] = useState("ADMIN");
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || (u.name?.toLowerCase().includes(q) ?? false);
  });

  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

  async function handleRoleChange(userId: string, newRole: string) {
    setLoadingId(userId); setError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        if (newRole === "USER") {
          setUsers((p) => p.filter((u) => u.id !== userId));
        } else {
          setUsers((p) => p.map((u) => u.id === userId ? { ...u, role: data.user.role } : u));
        }
      } else {
        setError(data.error ?? "Failed to update role");
      }
    } finally { setLoadingId(null); }
  }

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    if (!promoteEmail.trim()) return;
    setPromoting(true); setPromoteError(null);
    try {
      // Find user by email first
      const searchRes = await fetch(`/api/admin/users?email=${encodeURIComponent(promoteEmail)}`);
      const searchData = await searchRes.json();
      const found = (searchData.users ?? []).find((u: AdminUser) => u.email.toLowerCase() === promoteEmail.toLowerCase());
      if (!found) { setPromoteError("User not found"); return; }
      const res = await fetch("/api/admin/roles", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: found.id, role: promotingRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((p) => {
          const exists = p.find((u) => u.id === found.id);
          if (exists) return p.map((u) => u.id === found.id ? { ...u, role: data.user.role } : u);
          return [...p, { ...found, role: data.user.role }];
        });
        setPromoteEmail("");
      } else {
        setPromoteError(data.error ?? "Failed to promote");
      }
    } finally { setPromoting(false); }
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["SUPER_ADMIN", "ADMIN", "SUPPORT", "FINANCE"] as const).map((role) => {
          const count = users.filter((u) => u.role === role).length;
          const rc = ROLE_COLORS[role];
          return (
            <div key={role} className="p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[22px] font-semibold" style={{ color: rc.color }}>{count}</div>
              <div className="text-[11.5px] font-medium mt-1" style={{ color: "#8B95A7" }}>{role.replace("_", " ")}</div>
            </div>
          );
        })}
      </div>

      {/* Promote user */}
      <div className="p-5 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h3 className="text-[13.5px] font-semibold mb-3 flex items-center gap-2" style={{ color: "#F5F7FA" }}>
          <ShieldCheck size={15} style={{ color: "#6C63FF" }} /> Promote User to Admin
        </h3>
        <form onSubmit={handlePromote} className="flex gap-3 flex-wrap">
          <input
            type="email"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
            placeholder="user@example.com"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
          />
          <select
            className="px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
            value={promotingRole}
            onChange={(e) => setPromotingRole(e.target.value)}
          >
            {["ADMIN", "SUPPORT", "FINANCE", "SUPER_ADMIN"].map((r) => (
              <option key={r} value={r}>{r.replace("_", " ")}</option>
            ))}
          </select>
          <button type="submit" disabled={promoting || !promoteEmail} className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white" style={{ background: "#6C63FF", opacity: promoting || !promoteEmail ? 0.5 : 1 }}>
            {promoting ? "Promoting…" : "Promote"}
          </button>
        </form>
        {promoteError && <div className="text-[12px] mt-2" style={{ color: "#EF4444" }}>{promoteError}</div>}
      </div>

      {/* Admin users table */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1 max-w-[280px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
            <input
              className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
              placeholder="Filter admins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-[12px]" style={{ color: "#8B95A7" }}>{users.length} admin{users.length !== 1 ? "s" : ""} / {totalUsers} total users</div>
        </div>
        {error && <div className="text-[12px] mb-3 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>{error}</div>}
        <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="grid gap-3 px-5 py-3 border-b" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
            {["User", "Current Role", "Change Role", "Since"].map((h) => (
              <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
            ))}
          </div>
          {filtered.length === 0 && <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No admin users.</div>}
          {filtered.map((u) => {
            const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.USER;
            const isSelf = u.id === currentUserId;
            return (
              <div key={u.id} className="grid gap-3 px-5 py-3.5 border-b last:border-0 items-center" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr", borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>
                    {u.name ?? u.email}
                    {isSelf && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>You</span>}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: "#8B95A7" }}>{u.email}</div>
                </div>
                <div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ color: rc.color, background: rc.bg }}>
                    {u.role.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <select
                    className="text-[12px] px-2 py-1.5 rounded-lg outline-none"
                    style={{ background: "#07090D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={loadingId === u.id}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{fmt.format(new Date(u.createdAt))}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-[11.5px]" style={{ color: "#8B95A7" }}>
          Warning: Cannot demote the last SUPER_ADMIN. Promote another user first.
        </div>
      </div>
    </div>
  );
}
