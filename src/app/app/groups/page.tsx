"use client";

import { useState, useEffect } from "react";
import { Plus, Layers, Users, X, Check, Trash2, Edit2 } from "lucide-react";

const GROUP_COLORS = ["#6C63FF", "#22D3EE", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#F97316"];

type GroupItem = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  _count?: { members: number };
};

// ── Modal ─────────────────────────────────────────────────────────────────────

function GroupModal({ group, onClose, onSaved }: { group?: GroupItem; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [color, setColor] = useState(group?.color ?? GROUP_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const url = group ? `/api/groups/${group.id}` : "/api/groups";
      const method = group ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => { onSaved(); onClose(); }, 900);
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to save group.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{group ? "Edit Group" : "Create Group"}</h2>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <Check size={22} style={{ color: "#10B981" }} />
            </div>
            <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Group {group ? "updated" : "created"}!</div>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Group Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. VIP Customers"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Description</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#8B95A7", opacity: 0.6 }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {GROUP_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform"
                      style={{ background: c, transform: color === c ? "scale(1.2)" : "scale(1)", outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                    >
                      {color === c && <Check size={11} color="white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-[12px]" style={{ color: "#EF4444" }}>{error}</div>}
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: "#6C63FF", opacity: !name.trim() || saving ? 0.5 : 1 }}
              >
                {saving ? "Saving…" : group ? "Save Changes" : "Create Group"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | GroupItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/groups")
      .then(r => r.ok ? r.json() : null)
      .then((d: { groups?: GroupItem[] } | null) => { if (d?.groups) setGroups(d.groups); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deleteGroup = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/groups/${id}`, { method: "DELETE" }).catch(() => {});
    setGroups(prev => prev.filter(g => g.id !== id));
    setDeleting(null);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Groups</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Organize your audience into segments for targeted broadcasts.</p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF" }}
        >
          <Plus size={14} /> New Group
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Layers size={36} style={{ color: "#8B95A7", opacity: 0.25 }} />
          <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No groups yet</div>
          <div className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
            Create groups to segment your audience and target specific subscriber types.
          </div>
          <button
            onClick={() => setModal("create")}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: "#6C63FF" }}
          >
            <Plus size={14} /> Create Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g => (
            <div key={g.id} className="p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${g.color}1A` }}>
                  <Layers size={18} style={{ color: g.color }} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModal(g)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7" }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => deleteGroup(g.id)}
                    disabled={deleting === g.id}
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="text-[14px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>{g.name}</div>
              {g.description && <div className="text-[11.5px] mb-2" style={{ color: "#8B95A7" }}>{g.description}</div>}
              <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "#8B95A7" }}>
                <Users size={11} />
                <span>{(g._count?.members ?? 0).toLocaleString()} members</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === "create" && <GroupModal onClose={() => setModal(null)} onSaved={load} />}
      {modal && modal !== "create" && <GroupModal group={modal} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}
