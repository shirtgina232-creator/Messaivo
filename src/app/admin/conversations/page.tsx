import { prisma } from "@/lib/db";

export default async function AdminConversationsPage() {
  const [total, open, closed, byWorkspace] = await Promise.all([
    prisma.conversation.count(),
    prisma.conversation.count({ where: { status: "open" } }),
    prisma.conversation.count({ where: { status: "closed" } }),
    // Group conversation counts by workspaceId, then join workspace info
    prisma.conversation.groupBy({
      by: ["workspaceId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
  ]);

  // Fetch workspace names for the grouped results
  const workspaceIds = byWorkspace.map((r) => r.workspaceId);
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: workspaceIds } },
    select: { id: true, name: true, user: { select: { email: true } } },
  });
  const wsMap = Object.fromEntries(workspaces.map((w) => [w.id, w]));

  const cards = [
    { label: "Total",  value: total,  color: "#6C63FF" },
    { label: "Open",   value: open,   color: "#10B981" },
    { label: "Closed", value: closed, color: "#8B95A7" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Conversations</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Platform-wide conversation summary.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, color }) => (
          <div key={label} className="p-5 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[28px] font-semibold mb-1" style={{ color }}>{value.toLocaleString()}</div>
            <div className="text-[12px]" style={{ color: "#8B95A7" }}>{label} conversations</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-[14px] font-semibold" style={{ color: "#F5F7FA" }}>By Workspace (top 20)</h2>
        </div>
        <div
          className="grid grid-cols-[2fr_2fr_1fr] gap-3 px-5 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          {["Workspace", "Owner", "Conversations"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {byWorkspace.map((row) => {
          const ws = wsMap[row.workspaceId];
          return (
            <div
              key={row.workspaceId}
              className="grid grid-cols-[2fr_2fr_1fr] gap-3 px-5 py-3.5 border-b last:border-0 items-center"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div className="text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>{ws?.name ?? row.workspaceId}</div>
              <div className="text-[12.5px] truncate" style={{ color: "#8B95A7" }}>{ws?.user.email ?? "—"}</div>
              <div className="text-[12.5px] font-semibold" style={{ color: "#F5F7FA" }}>{row._count.id.toLocaleString()}</div>
            </div>
          );
        })}
        {byWorkspace.length === 0 && (
          <div className="px-5 py-8 text-center text-[13px]" style={{ color: "#8B95A7" }}>No conversations yet.</div>
        )}
      </div>
    </div>
  );
}
