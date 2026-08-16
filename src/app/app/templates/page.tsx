"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, Edit2, Trash2, X, Check, Copy } from "lucide-react";

type Template = {
  id: string;
  name: string;
  category: string | null;
  content: string;  // DB field name
  updatedAt: string;
  usageCount: number;
};

const CATEGORIES = ["All", "Greeting", "Follow-up", "Support", "Promotion"];

function TemplateModal({ template, onClose, onSave }: {
  template?: Template;
  onClose: () => void;
  onSave: (t: Template) => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState(template?.category ?? "Greeting");
  const [body, setBody] = useState(template?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const insertVar = (v: string) => setBody(prev => prev + v);

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    setError("");
    try {
      let res: Response;
      if (template) {
        res = await fetch(`/api/templates/${template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), content: body.trim(), category }),
        });
      } else {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), content: body.trim(), category }),
        });
      }
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json() as { template: Template };
      setSaved(true);
      setTimeout(() => { onSave(data.template); onClose(); }, 900);
    } catch {
      setError("Failed to save template. Please try again.");
      setSaving(false);
    }
  };

  const preview = body
    .replace("{{first_name}}", "Sarah")
    .replace("{{page_name}}", "My Page")
    .replace("{{date}}", new Date().toLocaleDateString());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-xl rounded-2xl overflow-hidden"
        style={{ background: "#0A111B", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>{template ? "Edit Template" : "New Template"}</h2>
          <button onClick={onClose}><X size={16} style={{ color: "#8B95A7" }} /></button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <Check size={22} style={{ color: "#10B981" }} />
            </div>
            <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>Template saved!</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-0 divide-x" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {/* Editor */}
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Template Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Welcome Message"
                    className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Category</label>
                  <select
                    value={category ?? "Greeting"}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-[13px] outline-none cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                  >
                    {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#8B95A7", opacity: 0.6 }}>Message Body</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={5}
                    placeholder="Hi {{first_name}}, …"
                    className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                  />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8B95A7", opacity: 0.6 }}>Variables</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["{{first_name}}", "{{page_name}}", "{{date}}"].map(v => (
                      <button key={v} className="text-[10px] font-mono px-2 py-1 rounded transition-colors" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }} onClick={() => insertVar(v)}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="text-[11.5px] text-red-400">{error}</p>}
              </div>

              {/* Preview */}
              <div className="p-5 flex flex-col gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7", opacity: 0.6 }}>Preview</div>
                {body ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-[#6C63FF] flex items-center justify-center text-[9px] font-bold text-white">M</div>
                      <span className="text-[11px] font-semibold" style={{ color: "#F5F7FA" }}>My Page</span>
                    </div>
                    <div className="p-3 rounded-xl text-[12px] text-white leading-relaxed" style={{ background: "#6C63FF", borderRadius: "12px 12px 2px 12px" }}>{preview}</div>
                    <div className="flex items-center gap-1">
                      <Check size={10} style={{ color: "#10B981" }} />
                      <span className="text-[10px]" style={{ color: "#8B95A7" }}>Delivered</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[12px]" style={{ color: "#8B95A7", opacity: 0.5 }}>
                    Start typing to see preview
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <button className="text-[13px] font-medium px-4 py-2 rounded-lg" style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }} onClick={onClose}>Cancel</button>
              <button
                className="text-[13px] font-semibold px-5 py-2 rounded-lg text-white transition-all disabled:opacity-40"
                style={{ background: "#6C63FF" }}
                disabled={!name.trim() || !body.trim() || saving}
                onClick={handleSave}
              >
                {saving ? "Saving…" : template ? "Save changes" : "Create template"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | undefined>();
  const [catFilter, setCatFilter] = useState("All");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates?limit=50")
      .then(r => r.ok ? r.json() : { templates: [] })
      .then(({ templates: t }: { templates: Template[] }) => setTemplates(t ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = catFilter === "All"
    ? templates
    : templates.filter(t => t.category === catFilter);

  const handleSave = (t: Template) => {
    setTemplates(prev => {
      const idx = prev.findIndex(x => x.id === t.id);
      if (idx >= 0) return prev.map(x => x.id === t.id ? t : x);
      return [t, ...prev];
    });
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Message Templates</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Create reusable message templates with dynamic variables.</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF", boxShadow: "0 0 20px rgba(108,99,255,0.25)" }}
          onClick={() => { setEditing(undefined); setModalOpen(true); }}
        >
          <Plus size={15} /> New Template
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className="shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: catFilter === c ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.04)",
              color: catFilter === c ? "#8B85FF" : "#8B95A7",
              border: `1px solid ${catFilter === c ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[13px]" style={{ color: "#8B95A7" }}>Loading templates…</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="p-5 rounded-xl flex flex-col gap-3 group" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(108,99,255,0.12)" }}>
                    <FileText size={14} style={{ color: "#6C63FF" }} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>{t.name}</div>
                    <div className="text-[10.5px]" style={{ color: "#8B95A7" }}>{t.category ?? "General"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                    onClick={() => handleCopy(t.content, t.id)}
                  >
                    {copied === t.id ? <Check size={12} style={{ color: "#10B981" }} /> : <Copy size={12} />}
                  </button>
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ color: "#8B95A7", background: "rgba(255,255,255,0.04)" }}
                    onClick={() => { setEditing(t); setModalOpen(true); }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ color: "#EF4444", background: "rgba(239,68,68,0.1)" }}
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color: "#8B95A7" }}>{t.content}</p>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="text-[10.5px]" style={{ color: "#8B95A7" }}>
                  Updated {new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span className="text-[10.5px]" style={{ color: "#8B95A7" }}>Used {t.usageCount}×</span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="md:col-span-2 xl:col-span-3 text-center py-12 text-[13px]" style={{ color: "#8B95A7" }}>
              {catFilter === "All" ? "No templates yet. Create your first one!" : `No templates in "${catFilter}".`}
            </div>
          )}

          {/* Add card */}
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
            <span className="text-[13px] font-semibold">New Template</span>
          </button>
        </div>
      )}

      {modalOpen && (
        <TemplateModal
          template={editing}
          onClose={() => { setModalOpen(false); setEditing(undefined); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
