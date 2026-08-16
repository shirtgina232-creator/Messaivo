"use client";

import { useState } from "react";
import { Plus, Layers, Users, X, Check, Trash2 } from "lucide-react";
import { DEMO_GROUPS, type Group } from "@/lib/demo-data";

function GroupModal({ group, onClose, onSave }: {
  group?: Group;
  onClose: () => void;
  onSave: (g: Group) => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [rules, setRules] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const RULE_OPTIONS = [
    "Joined in the last 30 days",
    "Has at least 5 conversations",
    "Status is Eligible",
    "Status is Recent",
    "Contacted in the last 7 days",
    "Tagged as VIP",
    "Connected to specific page",
  ];

  const toggleRule = (r: string) => setRules(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const handleSave = () => {
    if (!name.trim()) return;
    const g: Group = {
      id: group?.id ?? `g_${Date.now()}`,
      name,
      description,
      count: Math.floor(Math.random() * 300) + 10,
      updatedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      color: group?.color ?? ["#6C63FF", "#22D3EE", "#10B981", "#F59E0B", "#EC4899"][Math.floor(Math.random() * 5)],
    };
    setSaved(true);
    setTimeout(() => { onSave(g); onClose(); }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
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
                  placeholder="Describe this group…"
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#8B95A7", opacity: 0.6 }}>Filter Rules (optional)</label>
                <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
                  {RULE_OPTIONS.map(r => (
                    <button
                      key={r}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors text-[12.5px]"
                      style={{
                        background: rules.includes(r) ? "rgba(108,99,255,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${rules.includes(r) ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.06)"}`,
                        color: rules.includes(r) ? "#8B85FF" : "#8B95A7",
                      }}
                      onClick={() => toggleRule(r)}
                    >
                      <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: rules.includes(r) ? "#6C63FF" : "rgba(255,255,255,0.08)" }}>
                        {rules.includes(r) && <Check size={9} style={{ color: "#fff" }} />}
                      </div>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <button className="text-[13px] font-medium px-4 py-2 rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }} onClick={onClose}>Cancel</button>
              <button
                className="text-[13px] font-semibold px-5 py-2 rounded-lg text-white disabled:opacity-40"
                style={{ background: "#6C63FF" }}
                disabled={!name.trim()}
                onClick={handleSave}
              >
                {group ? "Save changes" : "Create group"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>(DEMO_GROUPS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Group | undefined>();

  const handleSave = (g: Group) => {
    setGroups(prev => {
      const idx = prev.findIndex(x => x.id === g.id);
      if (idx >= 0) return prev.map(x => x.id === g.id ? g : x);
      return [g, ...prev];
    });
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Customer Groups</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Organize your audience into segments for targeted messaging.</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF", boxShadow: "0 0 20px rgba(108,99,255,0.25)" }}
          onClick={() => { setEditing(undefined); setModalOpen(true); }}
        >
          <Plus size={15} /> Create Group
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(g => (
          <div key={g.id} className="group p-5 rounded-xl flex flex-col gap-4 transition-all hover:border-[rgba(255,255,255,0.14)]" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${g.color}18` }}>
                  <Layers size={16} style={{ color: g.color }} />
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>{g.name}</div>
                  <div className="text-[11px]" style={{ color: "#8B95A7" }}>{g.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                  onClick={() => { setEditing(g); setModalOpen(true); }}
                >
                  <span style={{ fontSize: 11 }}>✏</span>
                </button>
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: "#EF4444", background: "rgba(239,68,68,0.1)" }}
                  onClick={() => setGroups(prev => prev.filter(x => x.id !== g.id))}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>
                <Users size={13} style={{ color: g.color }} />
                {g.count.toLocaleString()} customers
              </div>
            </div>

            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all" style={{ background: g.color, width: `${Math.min((g.count / 400) * 100, 100)}%` }} />
            </div>

            <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-[10.5px]" style={{ color: "#8B95A7" }}>Updated {g.updatedAt}</span>
              <button
                className="text-[11px] font-medium"
                style={{ color: "#6C63FF" }}
                onClick={() => { setEditing(g); setModalOpen(true); }}
              >
                Edit
              </button>
            </div>
          </div>
        ))}

        <button
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed min-h-[160px] transition-all"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "#8B95A7" }}
          onClick={() => { setEditing(undefined); setModalOpen(true); }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(108,99,255,0.35)"; e.currentTarget.style.color = "#8B85FF"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#8B95A7"; }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Plus size={16} />
          </div>
          <span className="text-[13px] font-semibold">Create Group</span>
        </button>
      </div>

      {modalOpen && (
        <GroupModal
          group={editing}
          onClose={() => { setModalOpen(false); setEditing(undefined); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
