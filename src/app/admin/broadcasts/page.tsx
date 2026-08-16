import { prisma } from "@/lib/db";

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "rgba(139,149,167,0.1)", color: "#8B95A7" },
  scheduled: { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B" },
  running:   { bg: "rgba(108,99,255,0.1)",  color: "#8B85FF" },
  completed: { bg: "rgba(16,185,129,0.1)",  color: "#10B981" },
  failed:    { bg: "rgba(239,68,68,0.1)",   color: "#EF4444" },
};

export default async function AdminBroadcastsPage() {
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { workspace: { select: { name: true, user: { select: { email: true } } } } },
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Broadcasts</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>All broadcasts across all workspaces.</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          {["Broadcast", "Workspace", "Recipients", "Credits Used", "Status"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {broadcasts.map((b) => {
          const s = STATUS_COLOR[b.status] ?? STATUS_COLOR.draft;
          return (
            <div
              key={b.id}
              className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 border-b last:border-0 items-center"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div className="text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>{b.name}</div>
              <div className="min-w-0">
                <div className="text-[12.5px] truncate" style={{ color: "#8B95A7" }}>{b.workspace.name}</div>
                <div className="text-[11px] truncate" style={{ color: "#8B95A7", opacity: 0.7 }}>{b.workspace.user.email}</div>
              </div>
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>{b.totalRecipients.toLocaleString()}</div>
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>{b.creditsUsed.toLocaleString()}</div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full w-fit capitalize" style={s}>{b.status}</span>
            </div>
          );
        })}
        {broadcasts.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No broadcasts yet.</div>
        )}
      </div>
    </div>
  );
}
