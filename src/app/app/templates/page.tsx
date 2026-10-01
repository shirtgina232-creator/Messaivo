"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle, Clock, RefreshCw, Zap, FileText, ChevronDown } from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PageOption {
  id: string;
  pageName: string;
  pageId: string;
  isActive: boolean;
}

interface RegistrationInfo {
  id: string;
  status: string;
  metaTemplateName: string;
  metaTemplateId: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
}

interface UtilityTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  fields: Array<{ key: string; label?: string; example?: string }> | null;
  category: string | null;
  registration: RegistrationInfo | null;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  APPROVED:        { bg: "rgba(16,185,129,0.12)",  color: "#10B981", border: "rgba(16,185,129,0.25)",  label: "Approved" },
  PENDING:         { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B", border: "rgba(245,158,11,0.25)",  label: "Pending review" },
  CREATING:        { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B", border: "rgba(245,158,11,0.25)",  label: "Pending review" },
  REJECTED:        { bg: "rgba(239,68,68,0.12)",   color: "#EF4444", border: "rgba(239,68,68,0.25)",   label: "Rejected" },
  DISABLED:        { bg: "rgba(139,149,167,0.12)", color: "#8B95A7", border: "rgba(139,149,167,0.25)", label: "Disabled" },
  PAUSED:          { bg: "rgba(139,149,167,0.12)", color: "#8B95A7", border: "rgba(139,149,167,0.25)", label: "Paused" },
  MISSING:         { bg: "rgba(139,149,167,0.12)", color: "#8B95A7", border: "rgba(139,149,167,0.25)", label: "Not found at Meta" },
  CONTENT_MISMATCH:{ bg: "rgba(245,158,11,0.12)",  color: "#F59E0B", border: "rgba(245,158,11,0.25)",  label: "Outdated" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? { bg: "rgba(139,149,167,0.12)", color: "#8B95A7", border: "rgba(139,149,167,0.25)", label: status };
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, pageId, onUpdate }: {
  template: UtilityTemplate;
  pageId: string;
  onUpdate: (templateId: string, reg: RegistrationInfo) => void;
}) {
  const [registering, setRegistering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const status = template.registration?.status ?? null;
  const isPending = status === "PENDING" || status === "CREATING";
  const isApproved = status === "APPROVED";
  const canRegister = !status || status === "REJECTED" || status === "MISSING" || status === "CONTENT_MISMATCH";

  const handleRegister = useCallback(async () => {
    setRegistering(true); setError(null);
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(pageId)}/templates/${encodeURIComponent(template.id)}/register`, { method: "POST" });
      const data = await res.json() as { registration?: RegistrationInfo; error?: string };
      if (!res.ok || !data.registration) throw new Error(data.error ?? "Registration failed");
      onUpdate(template.id, data.registration);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }, [pageId, template.id, onUpdate]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true); setError(null);
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(pageId)}/utility-templates/${encodeURIComponent(template.id)}/refresh`, { method: "POST" });
      const data = await res.json() as { registration?: RegistrationInfo; error?: string };
      if (!res.ok || !data.registration) throw new Error(data.error ?? "Refresh failed");
      onUpdate(template.id, data.registration);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [pageId, template.id, onUpdate]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: `1px solid ${isApproved ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)"}` }}>
      <div className="px-4 py-3.5 flex items-start gap-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: isApproved ? "rgba(16,185,129,0.1)" : "rgba(108,99,255,0.1)" }}>
          {isApproved
            ? <CheckCircle2 size={15} style={{ color: "#10B981" }} />
            : <FileText size={15} style={{ color: "#6C63FF" }} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>{template.name}</span>
            {status && <StatusBadge status={status} />}
            {template.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7" }}>
                {template.category}
              </span>
            )}
          </div>

          {template.description && (
            <p className="text-[12px] mb-1.5" style={{ color: "#8B95A7" }}>{template.description}</p>
          )}

          {/* Expand/collapse content preview */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[11px] mb-2"
            style={{ color: "#8B95A7" }}>
            <ChevronDown size={11} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            {expanded ? "Hide preview" : "Show message"}
          </button>
          {expanded && (
            <div className="rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed mb-2 whitespace-pre-wrap"
              style={{ background: "rgba(255,255,255,0.04)", color: "#C4CDD8", border: "1px solid rgba(255,255,255,0.06)" }}>
              {template.content}
            </div>
          )}

          {/* Last checked */}
          {template.registration?.lastCheckedAt && (
            <p className="text-[11px] mb-1.5" style={{ color: "rgba(139,149,167,0.6)" }}>
              Last checked {new Date(template.registration.lastCheckedAt).toLocaleString()}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-1.5 text-[11.5px] mb-2 p-2 rounded-lg"
              style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Meta error from registration */}
          {template.registration?.lastError && !error && status !== "APPROVED" && (
            <div className="flex items-start gap-1.5 text-[11px] mb-2 p-2 rounded-lg"
              style={{ background: "rgba(245,158,11,0.06)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.12)" }}>
              <AlertCircle size={11} className="mt-0.5 shrink-0" />
              <span>{template.registration.lastError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {canRegister && (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-opacity"
                style={{ background: "#6C63FF", opacity: registering ? 0.6 : 1 }}>
                {registering ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                {registering ? "Enabling…" : status === "REJECTED" ? "Re-apply" : "Enable for this page"}
              </button>
            )}

            {(isPending || isApproved || status === "MISSING" || status === "CONTENT_MISMATCH") && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity"
                style={{ background: "rgba(255,255,255,0.05)", color: "#8B95A7", border: "1px solid rgba(255,255,255,0.08)", opacity: refreshing ? 0.6 : 1 }}>
                <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Checking…" : "Refresh status"}
              </button>
            )}

            {isApproved && (
              <span className="flex items-center gap-1 text-[11.5px]" style={{ color: "#10B981" }}>
                <CheckCircle2 size={12} /> Ready to use in Bulk Text
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [pages, setPages] = useState<PageOption[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [templates, setTemplates] = useState<UtilityTemplate[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // Load connected pages
  useEffect(() => {
    fetch("/api/pages?activeOnly=true")
      .then(r => r.json())
      .then((d: { pages?: PageOption[] }) => {
        const active = (d.pages ?? []).filter(p => p.isActive);
        setPages(active);
        if (active.length > 0) setSelectedPageId(active[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingPages(false));
  }, []);

  // Load templates for selected page
  useEffect(() => {
    if (!selectedPageId) return;
    setLoadingTemplates(true); setTemplatesError(null);
    fetch(`/api/pages/${encodeURIComponent(selectedPageId)}/utility-templates`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d: { templates?: UtilityTemplate[] }) => setTemplates(d.templates ?? []))
      .catch(() => setTemplatesError("Failed to load templates. Please try again."))
      .finally(() => setLoadingTemplates(false));
  }, [selectedPageId]);

  const handleUpdate = useCallback((templateId: string, reg: RegistrationInfo) => {
    setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, registration: reg } : t));
  }, []);

  const selectedPage = pages.find(p => p.id === selectedPageId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold mb-1" style={{ color: "#F5F7FA" }}>Utility Templates</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>
          Enable pre-approved message templates for your Facebook Pages.
          Approved templates can be used to reach contacts outside the 24-hour messaging window.
        </p>
      </div>

      {/* No pages state */}
      {!loadingPages && pages.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Zap size={28} style={{ color: "#8B95A7", opacity: 0.4 }} />
          <p className="text-[14px] font-medium" style={{ color: "#8B95A7" }}>No Facebook Pages connected</p>
          <p className="text-[12.5px] max-w-xs" style={{ color: "rgba(139,149,167,0.7)" }}>
            Connect a Facebook Page first to enable messaging templates.
          </p>
          <Link href="/app/pages"
            className="mt-1 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white"
            style={{ background: "#1877F2" }}>
            Connect a Page
          </Link>
        </div>
      )}

      {/* Page selector */}
      {!loadingPages && pages.length > 0 && (
        <div className="mb-5">
          <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "#8B95A7" }}>
            Facebook Page
          </label>
          {pages.length === 1 ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: "#6C63FF" }}>
                {pages[0].pageName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[13px] font-medium" style={{ color: "#F5F7FA" }}>{pages[0].pageName}</span>
            </div>
          ) : (
            <select
              value={selectedPageId}
              onChange={e => setSelectedPageId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}>
              {pages.map(p => (
                <option key={p.id} value={p.id}>{p.pageName}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Templates list */}
      {selectedPageId && (
        <>
          {loadingTemplates ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px]" style={{ color: "#8B95A7" }}>
              <Loader2 size={14} className="animate-spin" /> Loading templates…
            </div>
          ) : templatesError ? (
            <div className="flex items-center gap-2 p-4 rounded-xl text-[13px]"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
              <AlertCircle size={14} /> {templatesError}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <FileText size={28} style={{ color: "#8B95A7", opacity: 0.4 }} />
              <p className="text-[14px] font-medium" style={{ color: "#8B95A7" }}>No utility templates available</p>
              <p className="text-[12.5px] max-w-xs leading-relaxed" style={{ color: "rgba(139,149,167,0.7)" }}>
                Utility templates are created by the admin team. Check back soon or contact support.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* How it works */}
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg mb-1 text-[12px]"
                style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)", color: "#A89DFF" }}>
                <Clock size={13} className="mt-0.5 shrink-0" />
                <span>
                  Click <strong>Enable for this page</strong> to submit a template to Meta for review.
                  Approval typically takes a few minutes to a few hours.
                  Once <strong>Approved</strong>, the template becomes available in Bulk Text broadcasts.
                </span>
              </div>

              {templates.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  pageId={selectedPageId}
                  onUpdate={handleUpdate}
                />
              ))}

              {selectedPage && (
                <p className="text-[11.5px] text-center mt-2" style={{ color: "rgba(139,149,167,0.5)" }}>
                  Showing templates for <strong style={{ color: "#8B95A7" }}>{selectedPage.pageName}</strong>.
                  {" "}Templates are approved per Facebook Page and cannot be used across pages.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
