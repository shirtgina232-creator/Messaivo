import { prisma } from "@/lib/db";
import { requireAdminOrError } from "@/lib/admin-helpers";
import { ok, serverError } from "@/lib/api-helpers";

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;

  try {
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
    return ok({ workspaces });
  } catch (e) {
    console.error("[GET /api/admin/credits]", e);
    return serverError();
  }
}
