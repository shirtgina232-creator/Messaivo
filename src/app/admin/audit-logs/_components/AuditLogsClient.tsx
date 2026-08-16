"use client";

import { useState } from "react";

type Log = {
  id: string; action: string; targetId: string | null; targetType: string | null;
  details: unknown; createdAt: Date;
  admin: { name: string | null; email: string };
};

const fmt = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
});

function DetailsCell({ details }: { details: unknown }) {
  const [open, setOpen] = useState(false);
  if (!details) return <span style={{ color: "#8B95A7" }}>—</span>;
  const str = JSON.stringify(details, null, 2);
  if (str.length <= 40) {
    return <span className="text-[11px] font-mono" style={{ color: "#8B95A7" }}>{str}</span>;
  }
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="text-[11px] underline" style={{ color: "#6C63FF" }}>
        {open ? "hide" : "show details"}
      </button>
      {open && (
        <pre className="mt-1 text-[10.5px] p-2 rounded overflow-x-auto max-w-[300px]" style={{ background: "rgba(255,255,255,0.04)", color: "#8B95A7", border: "1px solid rgba(255,255,255,0.06)" }}>
          {str}
        </pre>
      )}
    </div>
  );
}

export default function AuditLogsClient({ initialLogs, actionTypes }: {
  initialLogs: Log[]; actionTypes: string[];
}) {
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialLogs.length === 50);

  const filtered = actionFilter === "ALL" ? logs : logs.filter((l) => l.action === actionFilter);

  async function loadMore() {
    if (!logs.length) return;
    setLoading(true);
    try {
      const last = logs[logs.length - 1];
      const res = await fetch(`/api/admin/audit-logs?cursor=${last.id}`);
      if (res.ok) {
        const data = await res.json();
        const newLogs: Log[] = data.logs ?? [];
        setLogs((p) => [...p, ...newLogs]);
        setHasMore(newLogs.length === 50);
      }
    } finally { setLoading(false); }
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select
          className="px-3 py-2 rounded-lg text-[12.5px] outline-none"
          style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="ALL">All Actions</option>
          {actionTypes.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
        <div className="text-[12px] ml-auto" style={{ color: "#8B95A7" }}>{filtered.length} log{filtered.length !== 1 ? "s" : ""} shown</div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="grid gap-3 px-5 py-3 border-b"
          style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1.5fr 2fr", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          {["Action", "Admin", "Target Type", "Target ID", "Time", "Details"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No audit logs match your filter.</div>
        )}
        {filtered.map((log) => (
          <div
            key={log.id}
            className="grid gap-3 px-5 py-3.5 border-b last:border-0 items-start"
            style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1.5fr 2fr", borderColor: "rgba(255,255,255,0.05)" }}
          >
            <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded w-fit mt-0.5" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
              {log.action.replace(/_/g, " ")}
            </span>
            <div className="text-[12px] truncate" style={{ color: "#8B95A7" }}>
              {log.admin.name ?? log.admin.email}
            </div>
            <div className="text-[12px]" style={{ color: "#8B95A7" }}>{log.targetType ?? "—"}</div>
            <div className="text-[11px] font-mono truncate" style={{ color: "#8B95A7", opacity: 0.7 }}>
              {log.targetId ? log.targetId.slice(0, 10) + "…" : "—"}
            </div>
            <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{fmt.format(new Date(log.createdAt))}</div>
            <div><DetailsCell details={log.details} /></div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-5 py-2 rounded-lg text-[12.5px] font-medium"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#8B95A7", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
