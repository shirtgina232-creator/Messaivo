import { prisma } from "@/lib/db";

export default async function AdminWorkspacesPage() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      planId: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      creditLedger: {
        select: {
          monthlyAllocation: true,
          usedThisPeriod: true,
          unlimitedCredits: true,
        },
      },
      _count: { select: { pages: true, contacts: true, broadcasts: true } },
    },
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Workspaces</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>All customer workspaces and their usage summary.</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          {["Workspace", "Owner", "Plan", "Pages", "Contacts", "Credits"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {workspaces.map((ws) => {
          const used = ws.creditLedger?.usedThisPeriod ?? 0;
          const alloc = ws.creditLedger?.monthlyAllocation ?? 0;
          const unlimited = ws.creditLedger?.unlimitedCredits ?? false;
          return (
            <div
              key={ws.id}
              className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 border-b last:border-0 items-center"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div className="text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>{ws.name}</div>
              <div className="min-w-0">
                <div className="text-[12.5px] truncate" style={{ color: "#8B95A7" }}>{ws.user.name ?? "—"}</div>
                <div className="text-[11px] truncate" style={{ color: "#8B95A7", opacity: 0.7 }}>{ws.user.email}</div>
              </div>
              <span className="text-[11.5px] px-2 py-0.5 rounded-full w-fit" style={{ background: "rgba(108,99,255,0.1)", color: "#8B85FF" }}>
                {ws.planId}
              </span>
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>{ws._count.pages}</div>
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>{ws._count.contacts.toLocaleString()}</div>
              <div className="text-[12px]" style={{ color: unlimited ? "#10B981" : "#8B95A7" }}>
                {unlimited ? "∞ Unlimited" : `${used.toLocaleString()} / ${alloc.toLocaleString()}`}
              </div>
            </div>
          );
        })}
        {workspaces.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No workspaces yet.</div>
        )}
      </div>
    </div>
  );
}
