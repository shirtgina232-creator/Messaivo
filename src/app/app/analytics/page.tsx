"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, BarChart2, Users, MessageSquare, Radio } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

type Range = "7d" | "30d" | "90d";

type AnalyticsData = {
  points: { label: string; conversations: number }[];
  totalContacts: number;
  broadcastCount: number;
  openCount: number;
  totalInPeriod: number;
  responseRate: number;
};

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
          <div
            className="w-full rounded-t-sm transition-all duration-500 relative"
            style={{ height: `${(d.value / max) * 96}px`, background: i === data.length - 1 ? color : `${color}55`, minHeight: 4 }}
          >
            <div
              className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-semibold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
              style={{ background: "#0A111B", color: "#F5F7FA", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {d.value.toLocaleString()}
            </div>
          </div>
          <span className="text-[9.5px]" style={{ color: "#8B95A7" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded ${className}`} style={{ background: "rgba(255,255,255,0.06)" }} />;
}

export default function AnalyticsPage() {
  const { selectedPageId, pages } = useWorkspace();
  const [range, setRange] = useState<Range>("7d");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync pageFilter when workspace selectedPageId changes
  useEffect(() => {
    setPageFilter(selectedPageId ?? "all");
  }, [selectedPageId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ range });
    if (pageFilter !== "all") params.set("pageId", pageFilter);
    fetch(`/api/analytics?${params}`)
      .then(r => r.ok ? r.json() as Promise<AnalyticsData> : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range, pageFilter]);

  const convData = useMemo(() => (data?.points ?? []).map(p => ({ label: p.label, value: p.conversations })), [data]);

  const metrics = data ? [
    { label: "Conversations", value: data.totalInPeriod.toLocaleString(), icon: MessageSquare, color: "#6C63FF" },
    { label: "Response Rate",  value: `${data.responseRate}%`,            icon: TrendingUp,    color: "#10B981" },
    { label: "Total Audience", value: data.totalContacts.toLocaleString(), icon: Users,        color: "#22D3EE" },
    { label: "Broadcasts",     value: data.broadcastCount.toLocaleString(), icon: Radio,       color: "#F59E0B" },
  ] : null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Analytics</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Track your messaging performance and audience growth.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {pages.length > 1 && (
            <select
              value={pageFilter}
              onChange={e => setPageFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[12px] outline-none cursor-pointer"
              style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}
            >
              <option value="all">All Pages</option>
              {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)" }}>
            {(["7d", "30d", "90d"] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                style={{ background: range === r ? "#6C63FF" : "transparent", color: range === r ? "#fff" : "#8B95A7" }}
              >
                {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading || !metrics ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Skeleton className="w-8 h-8 mb-3" />
              <Skeleton className="h-6 w-16 mb-1.5" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : metrics.map(m => (
          <div key={m.label} className="p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${m.color}15` }}>
                <m.icon size={14} style={{ color: m.color }} />
              </div>
            </div>
            <div className="text-[22px] font-semibold mb-0.5" style={{ color: "#F5F7FA" }}>{m.value}</div>
            <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {data && data.totalInPeriod === 0 ? (
        <div className="p-10 rounded-xl flex flex-col items-center justify-center gap-3" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <BarChart2 size={32} style={{ color: "#8B95A7", opacity: 0.3 }} />
          <div className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>No activity yet</div>
          <div className="text-[12.5px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
            Connect a Facebook Page and start receiving messages to see your analytics here.
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>Conversation Volume</div>
              <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>
                {loading ? "Loading…" : `${(data?.totalInPeriod ?? 0).toLocaleString()} total in period`}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(108,99,255,0.12)" }}>
              <BarChart2 size={14} style={{ color: "#6C63FF" }} />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <BarChart data={convData} color="#6C63FF" />
          )}
        </div>
      )}
    </div>
  );
}
