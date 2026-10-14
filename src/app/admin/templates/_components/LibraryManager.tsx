"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Loader2, Check, Zap, AlertTriangle, RefreshCw, BookOpen } from "lucide-react";

interface LibraryResult {
  name: string;
  language: string;
  category: string;
  topic: string | null;
  body: string;
  paramCount: number;
  bodyParams: string[];
  buttons: Array<{ type: string; text: string }>;
}

interface CatalogTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  libraryTemplateName: string | null;
  isUtility: boolean;
  status: string;
  isActive: boolean;
}

const inp = "w-full px-3 py-2 rounded-lg text-[13px] outline-none";
const inpStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#F5F7FA",
} as const;

// ── Library curation (Super Admin) ───────────────────────────────────────────
// Browse Meta's pre-approved library, add entries to the catalog. Provisioning
// to Pages happens automatically on page activation + via the backfill below.

export default function LibraryManager() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [catalog, setCatalog] = useState<CatalogTemplate[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch("/api/admin/templates");
      const data = await res.json() as { templates?: CatalogTemplate[] };
      setCatalog((data.templates ?? []).filter(t => t.libraryTemplateName));
    } catch { setError("Failed to load catalog"); }
    finally { setLoadingCatalog(false); }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const inCatalog = (name: string) => catalog.some(c => c.libraryTemplateName === name && c.isActive);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setSearching(true); setError(null);
    try {
      const res = await fetch(`/api/admin/templates/library/search?q=${encodeURIComponent(query)}`);
      const data = await res.json() as { templates?: LibraryResult[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.templates ?? []);
      setSearched(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Search failed"); }
    finally { setSearching(false); }
  }

  async function handleAdd(r: LibraryResult) {
    setAdding(r.name); setError(null);
    try {
      const res = await fetch("/api/admin/templates/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryTemplateName: r.name,
          body: r.body,
          bodyParams: r.bodyParams,
          description: r.topic ? `Meta library · ${r.topic}` : "Meta pre-approved library template",
        }),
      });
      const data = await res.json() as { template?: CatalogTemplate; error?: string; deduped?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Failed to add to catalog");
      await loadCatalog();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add to catalog"); }
    finally { setAdding(null); }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this template from the catalog? Existing Page clones keep working.")) return;
    setRemoving(id); setError(null);
    try {
      const res = await fetch(`/api/admin/templates/library/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      await loadCatalog();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to remove"); }
    finally { setRemoving(null); }
  }

  async function handleProvisionMissing() {
    if (!confirm(`Provision ${catalog.length} catalog template(s) to all pages missing them? This calls the Meta API for each page.`)) return;
    setProvisioning(true); setProvisionResult(null); setError(null);
    try {
      const res = await fetch("/api/admin/templates/provision-missing", { method: "POST" });
      const data = await res.json() as {
        ok?: boolean; pagesProcessed?: number; totals?: { provisioned: number; skipped: number; failed: number; errors: number };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Provisioning failed");
      const t = data.totals!;
      setProvisionResult(
        `${data.pagesProcessed} page(s) processed · ${t.provisioned} provisioned · ${t.skipped} already present · ${t.failed} template failures · ${t.errors} page errors`
      );
    } catch (err) { setError(err instanceof Error ? err.message : "Provisioning failed"); }
    finally { setProvisioning(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Explainer */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-[12.5px]"
        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#6EE7B7" }}>
        <BookOpen size={14} className="mt-0.5 shrink-0" />
        <span>
          <strong>Library-first:</strong> pick Meta&apos;s pre-approved templates once. They clone to every
          customer Page automatically on activation — <strong>APPROVED instantly</strong>, no review, no per-page manual work.
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-[12.5px]"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Catalog */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>
            Catalog <span style={{ color: "#8B95A7" }}>({catalog.length})</span>
          </h2>
          <button
            onClick={handleProvisionMissing}
            disabled={provisioning || catalog.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40"
            style={{ background: "#6C63FF" }}>
            {provisioning ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {provisioning ? "Provisioning…" : "Provision missing templates"}
          </button>
        </div>
        {provisionResult && (
          <p className="text-[12px] mb-3" style={{ color: "#10B981" }}>{provisionResult}</p>
        )}
        {loadingCatalog ? (
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "#8B95A7" }}>
            <Loader2 size={12} className="animate-spin" /> Loading catalog…
          </div>
        ) : catalog.length === 0 ? (
          <p className="text-[12.5px] px-4 py-6 rounded-xl text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#8B95A7" }}>
            No library templates curated yet. Search Meta&apos;s library below to add the first one.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {catalog.map(c => (
              <div key={c.id} className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>{c.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                      LIBRARY
                    </span>
                  </div>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: "#8B95A7" }}>{c.libraryTemplateName}</p>
                  <p className="text-[12px] mt-1 line-clamp-2" style={{ color: "rgba(196,205,216,0.7)" }}>{c.content}</p>
                </div>
                <button
                  onClick={() => handleRemove(c.id)}
                  disabled={removing === c.id}
                  className="shrink-0 p-2 rounded-lg disabled:opacity-40"
                  style={{ color: "#EF4444", background: "rgba(239,68,68,0.06)" }}
                  title="Remove from catalog">
                  {removing === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Search */}
      <section>
        <h2 className="text-[15px] font-semibold mb-3" style={{ color: "#F5F7FA" }}>
          Browse Meta&apos;s library
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search templates (e.g. appointment, order, reminder)…"
              className={`${inp} pl-9`}
              style={inpStyle}
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40 flex items-center gap-1.5"
            style={{ background: "#6C63FF" }}>
            {searching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            Search
          </button>
        </form>

        {searched && results.length === 0 && (
          <p className="text-[12.5px]" style={{ color: "#8B95A7" }}>No library templates found. Try a different search.</p>
        )}

        <div className="flex flex-col gap-2">
          {results.map(r => {
            const added = inCatalog(r.name);
            return (
              <div key={r.name} className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-mono font-semibold" style={{ color: "#F5F7FA" }}>{r.name}</span>
                    {r.topic && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7" }}>
                        {r.topic}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>
                      {r.paramCount} param{r.paramCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: "rgba(196,205,216,0.8)" }}>{r.body}</p>
                  {r.buttons.length > 0 && (
                    <p className="text-[11px] mt-1" style={{ color: "#8B95A7" }}>
                      Buttons: {r.buttons.map(b => b.text).join(" · ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleAdd(r)}
                  disabled={added || adding === r.name}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-40"
                  style={added
                    ? { background: "rgba(16,185,129,0.1)", color: "#10B981" }
                    : { background: "#6C63FF", color: "#fff" }}>
                  {adding === r.name ? <Loader2 size={12} className="animate-spin" />
                    : added ? <><Check size={12} /> In catalog</>
                    : <><Plus size={12} /> Add to catalog</>}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
