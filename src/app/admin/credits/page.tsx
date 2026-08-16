import { prisma } from "@/lib/db";
import CreditsManager from "./_components/CreditsManager";

export default async function AdminCreditsPage() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      user: { select: { email: true, name: true } },
      creditLedger: {
        select: {
          monthlyAllocation: true,
          bonusCredits: true,
          usedThisPeriod: true,
          unlimitedCredits: true,
        },
      },
    },
  });

  const initialRows = workspaces
    .filter((ws) => ws.creditLedger !== null)
    .map((ws) => ({
      id: ws.id,
      name: ws.name,
      email: ws.user.email,
      customerName: ws.user.name,
      monthlyAllocation: ws.creditLedger!.monthlyAllocation,
      bonusCredits: ws.creditLedger!.bonusCredits,
      usedThisPeriod: ws.creditLedger!.usedThisPeriod,
      unlimitedCredits: ws.creditLedger!.unlimitedCredits,
    }));

  const noLedger = workspaces.filter((ws) => !ws.creditLedger);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Credits</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>
          Manage credit balances. <strong style={{ color: "#F5F7FA" }}>+</strong> adds bonus credits,&nbsp;
          <strong style={{ color: "#F5F7FA" }}>−</strong> removes bonus credits,&nbsp;
          <strong style={{ color: "#F5F7FA" }}>#</strong> sets the monthly allocation exactly.
          Unlimited mode bypasses all credit checks.
        </p>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <CreditsManager initialRows={initialRows} />

        {initialRows.length === 0 && noLedger.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>
            No workspaces yet.
          </div>
        )}

        {noLedger.length > 0 && (
          <div
            className="px-5 py-3 border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <p className="text-[11px]" style={{ color: "#8B95A7" }}>
              {noLedger.length} workspace{noLedger.length > 1 ? "s have" : " has"} no credit ledger yet (created before billing was configured).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
