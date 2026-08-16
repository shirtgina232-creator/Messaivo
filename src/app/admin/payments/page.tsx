import { prisma } from "@/lib/db";

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  paid: { color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  pending: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  failed: { color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  refunded: { color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
};

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export default async function AdminPaymentsPage() {
  const [invoices, aggregate] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        workspace: { select: { name: true, planId: true, user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.invoice.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
  ]);
  const totalPaid = (aggregate._sum.amount ?? 0) / 100;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Payments</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>All invoices synced from Stripe.</p>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-semibold" style={{ color: "#10B981" }}>
            ${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>Total Paid</div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="grid gap-3 px-5 py-3 border-b"
          style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr", borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          {["Customer", "Workspace", "Plan", "Amount", "Status", "Date"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8B95A7" }}>{h}</span>
          ))}
        </div>
        {invoices.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>No invoices yet.</div>
        )}
        {invoices.map((inv) => {
          const sc = STATUS_COLORS[inv.status] ?? { color: "#8B95A7", bg: "rgba(255,255,255,0.06)" };
          return (
            <div
              key={inv.id}
              className="grid gap-3 px-5 py-3.5 border-b last:border-0 items-center"
              style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr", borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium truncate" style={{ color: "#F5F7FA" }}>
                  {inv.workspace.user.name ?? inv.workspace.user.email}
                </div>
                <div className="text-[11px] truncate" style={{ color: "#8B95A7" }}>{inv.workspace.user.email}</div>
              </div>
              <div className="text-[12px] truncate" style={{ color: "#8B95A7" }}>{inv.workspace.name}</div>
              <div className="text-[12px]" style={{ color: "#8B95A7" }}>{inv.planId ?? inv.workspace.planId ?? "—"}</div>
              <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>
                ${(inv.amount / 100).toFixed(2)} <span className="text-[10px] font-normal uppercase" style={{ color: "#8B95A7" }}>{inv.currency}</span>
              </div>
              <div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: sc.color, background: sc.bg }}>
                  {inv.status}
                </span>
              </div>
              <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>{fmt(inv.createdAt)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
