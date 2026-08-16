import { prisma } from "@/lib/db";
import { requireFinanceOrError } from "@/lib/admin-helpers";
import { ok, serverError } from "@/lib/api-helpers";

export async function GET() {
  const [, err] = await requireFinanceOrError();
  if (err) return err;
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            planId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
    const totalPaid = invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + i.amount, 0);
    return ok({ invoices, totalPaid });
  } catch (e) {
    console.error("[GET /api/admin/payments]", e);
    return serverError();
  }
}
