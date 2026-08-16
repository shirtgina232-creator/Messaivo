import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, notFound, serverError } from "@/lib/api-helpers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;

  try {
    const { workspaceId } = await params;

    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { creditLedger: true },
    });
    if (!ws) return notFound("Workspace not found");
    if (!ws.creditLedger) return badRequest("Workspace has no credit ledger");

    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

    const { action, amount, value } = body as Record<string, unknown>;

    let updatedLedger: Awaited<ReturnType<typeof prisma.creditLedger.update>>;

    if (action === "unlimited") {
      if (typeof value !== "boolean") return badRequest("value must be a boolean");
      updatedLedger = await prisma.creditLedger.update({
        where: { workspaceId },
        data: { unlimitedCredits: value },
      });
      await logAdminAction(
        admin.id,
        value ? "ENABLE_UNLIMITED_CREDITS" : "DISABLE_UNLIMITED_CREDITS",
        workspaceId,
        "workspace",
        { workspaceName: ws.name },
      );
    } else if (action === "add" || action === "remove") {
      if (!amount || typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
        return badRequest("amount must be a positive integer");
      }

      updatedLedger = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const ledger = await tx.creditLedger.findUniqueOrThrow({ where: { workspaceId } });
        const delta = action === "add" ? amount : -amount;
        const newBonus = Math.max(0, ledger.bonusCredits + delta);
        return tx.creditLedger.update({
          where: { workspaceId },
          data: { bonusCredits: newBonus },
        });
      });

      await logAdminAction(
        admin.id,
        action === "add" ? "ADD_CREDITS" : "REMOVE_CREDITS",
        workspaceId,
        "workspace",
        { amount, workspaceName: ws.name },
      );
    } else if (action === "set") {
      if (!Number.isInteger(amount) || (amount as number) < 0) {
        return badRequest("amount must be a non-negative integer");
      }
      updatedLedger = await prisma.creditLedger.update({
        where: { workspaceId },
        data: { monthlyAllocation: amount as number },
      });
      await logAdminAction(admin.id, "SET_MONTHLY_CREDITS", workspaceId, "workspace", {
        amount,
        workspaceName: ws.name,
      });
    } else {
      return badRequest("action must be 'add', 'remove', 'set', or 'unlimited'");
    }

    return ok({ ledger: updatedLedger });
  } catch (e) {
    console.error("[PATCH /api/admin/credits/[workspaceId]]", e);
    return serverError();
  }
}
