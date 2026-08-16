import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, serverError, ok } from "@/lib/api-helpers";

export async function GET() {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const [ledger, recentTransactions] = await Promise.all([
      prisma.creditLedger.findUnique({
        where: { workspaceId: ws.id },
        select: {
          id: true, workspaceId: true, monthlyAllocation: true, bonusCredits: true,
          usedThisPeriod: true, periodStart: true, periodEnd: true,
          unlimitedCredits: true, updatedAt: true,
        },
      }),
      prisma.creditTransaction.findMany({
        where: { workspaceId: ws.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const available = ledger
      ? ledger.monthlyAllocation + ledger.bonusCredits - ledger.usedThisPeriod
      : 0;

    return ok({ ledger, available, recentTransactions });
  } catch (e) {
    console.error("[GET /api/credits]", e);
    return serverError();
  }
}
