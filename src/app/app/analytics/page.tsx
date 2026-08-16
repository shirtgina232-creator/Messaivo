"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, BarChart2, Users, MessageSquare, Radio } from "lucide-react";
import { ANALYTICS_7D, ANALYTICS_30D, ANALYTICS_90D, DEMO_PAGES } from "@/lib/demo-data";
import { useWorkspace } from "@/lib/workspace-context";

type Range = "7d" | "30d" | "90d";

function BarChart({ data, keyName, color }: { data: { label: string; value: number }[]; keyName: string; color: string }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
          <div
            className="w-full rounded-t-sm transition-all duration-500 relative"
            style={{ height: `${max > 0 ? (d.value / max) * 96 : 4}px`, background: i === data.length - 1 ? color : `${color}55`, minHeight: 4 }}
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

function LineChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const w = 400;
  const h = 80;
  const pts = data.map((d, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((d.value - min) / range) * (h - 8) - 4 }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const fillPath = `${path} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#lg)" />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="#101722" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[9.5px]" style={{ color: "#8B95A7" }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { selectedPageId, connectedPageIds } = useWorkspace();
  const [range, setRange] = useState<Range>("7d");
  const [pageFilter, setPageFilter] = useState(selectedPageId ?? "all");
  const connectedPages = DEMO_PAGES.filter(p => connectedPageIds.includes(p.id));

  const baseRaw = range === "7d" ? ANALYTICS_7D : range === "30d" ? ANALYTICS_30D : ANALYTICS_90D;
  // Apply per-page scaling for demo purposes
  const pageMultiplier = pageFilter === "all" ? 1 : pageFilter === "p1" ? 0.52 : pageFilter === "p2" ? 0.31 : 0.17;
  const raw = baseRaw.map(d => ({
    ...d,
    conversations: Math.round(d.conversations * pageMultiplier),
    responses: Math.round(d.responses * pageMultiplier),
    audience: Math.round(d.audience * pageMultiplier),
  }));

  const totalConversations = useMemo(() => raw.reduce((s, d) => s + d.conversations, 0), [raw]);
  const totalResponses = useMemo(() => raw.reduce((s, d) => s + d.responses, 0), [raw]);
  const lastAudience = raw[raw.length - 1].audience;
  const firstAudience = raw[0].audience;
  const audienceGrowth = lastAudience - firstAudience;
  const responseRate = totalConversations > 0 ? Math.round((totalResponses / totalConversations) * 100) : 0;

  const convData = raw.map(d => ({ label: d.label, value: d.conversations }));
  const respData = raw.map(d => ({ label: d.label, value: d.responses }));
  const audData  = raw.map(d => ({ label: d.label, value: d.audience }));

  const metrics = [
    { label: "Conversations", value: totalConversations.toLocaleString(), change: "+12%", up: true,  icon: MessageSquare, color: "#6C63FF" },
    { label: "Response Rate",  value: `${responseRate}%`,                 change: "+3%",  up: true,  icon: TrendingUp,    color: "#10B981" },
    { label: "Audience",       value: lastAudience.toLocaleString(),      change: `+${audienceGrowth}`, up: true,  icon: Users,    color: "#22D3EE" },
    { label: "Broadcasts",     value: range === "7d" ? "1" : range === "30d" ? "2" : "3", change: "0", up: true, icon: Radio, color: "#F59E0B" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Analytics</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>Track your messaging performance and audience growth.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {connectedPages.length > 1 && (
            <select
              value={pageFilter}
              onChange={e => setPageFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[12px] outline-none cursor-pointer"
              style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7" }}
            >
              <option value="all">All Pages</option>
              {connectedPages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["7d", "30d", "90d"] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: range === r ? "#6C63FF" : "transparent",
                color: range === r ? "#fff" : "#8B95A7",
              }}
            >
              {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map(m => (
          <div key={m.label} className="p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${m.color}15` }}>
                <m.icon size={14} style={{ color: m.color }} />
              </div>
              <div className={`flex items-center gap-1 text-[11px] font-medium ${m.up ? "text-green-400" : "text-red-400"}`}>
                {m.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {m.change}
              </div>
            </div>
            <div className="text-[22px] font-semibold mb-0.5" style={{ color: "#F5F7FA" }}>{m.value}</div>
            <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="p-5 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>Conversation Volume</div>
              <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{totalConversations.toLocaleString()} total</div>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(108,99,255,0.12)" }}>
              <BarChart2 size={14} style={{ color: "#6C63FF" }} />
            </div>
          </div>
          <BarChart data={convData} keyName="conversations" color="#6C63FF" />
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>Response Activity</div>
              <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{responseRate}% response rate</div>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
              <TrendingUp size={14} style={{ color: "#10B981" }} />
            </div>
          </div>
          <BarChart data={respData} keyName="responses" color="#10B981" />
        </div>
      </div>

      <div className="p-5 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13.5px] font-semibold" style={{ color: "#F5F7FA" }}>Audience Growth</div>
            <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>+{audienceGrowth} in this period</div>
          </div>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,211,238,0.12)" }}>
            <Users size={14} style={{ color: "#22D3EE" }} />
          </div>
        </div>
        <LineChart data={audData} color="#22D3EE" />
      </div>
    </div>
  );
}
