"use client";

import { useState } from "react";
import { Shield, User } from "lucide-react";

export default function RoleButton({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const newRole = role === "ADMIN" ? "USER" : "ADMIN";
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) setRole(newRole);
      else alert("Failed to update role.");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === "ADMIN";

  return (
    <div className="flex items-center gap-2">
      <span
        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
        style={{
          background: isAdmin ? "rgba(239,68,68,0.1)" : "rgba(108,99,255,0.1)",
          color: isAdmin ? "#EF4444" : "#8B85FF",
        }}
      >
        {isAdmin ? <Shield size={10} /> : <User size={10} />}
        {role}
      </span>
      <button
        onClick={toggle}
        disabled={loading}
        className="text-[11px] px-2.5 py-1 rounded-lg transition-colors"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: loading ? "#8B95A7" : "#F5F7FA",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "…" : isAdmin ? "Demote" : "Promote"}
      </button>
    </div>
  );
}
