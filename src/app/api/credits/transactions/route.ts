import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok, created } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const transactions = await prisma.creditTransaction.findMany({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = transactions.length > limit;
    const items = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return ok({ transactions: items, nextCursor });
  } catch (e) {
    console.error("[GET /api/credits/transactions]", e);
    return serverError();
  }
}

// POST — debit (consume credits) or credit (add bonus credits)
// Debit: atomically increments usedThisPeriod; rejects if balance would go negative
// Credit: atomically increments bonusCredits
export async function POST(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { type, amount, operation, description, broadcastId, messageId } =
      body as Record<string, unknown>;

    if (!type || !["debit", "credit"].includes(type as string)) {
      return badRequest("type must be 'debit' or 'credit'");
    }
    if (!amount || typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
      return badRequest("amount must be a positive integer");
    }

    let transaction: Awaited<ReturnType<typeof prisma.creditTransaction.create>>;

    try {
      transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const ledger = await tx.creditLedger.findUniqueOrThrow({
          where: { workspaceId: ws.id },
        });

        const available = ledger.monthlyAllocation + ledger.bonusCredits - ledger.usedThisPeriod;

        if (type === "debit") {
          // Unlimited credits: skip balance check and skip deducting usedThisPeriod
          if (!ledger.unlimitedCredits && available < (amount as number)) {
            throw new Error("INSUFFICIENT_CREDITS");
          }

          if (!ledger.unlimitedCredits) {
            await tx.creditLedger.update({
              where: { workspaceId: ws.id },
              data: { usedThisPeriod: ledger.usedThisPeriod + (amount as number) },
            });
          }

          return tx.creditTransaction.create({
            data: {
              workspaceId: ws.id,
              type: "debit",
              amount: amount as number,
              // When unlimited, balance stays unchanged; record for audit only
              balanceAfter: ledger.unlimitedCredits ? available : available - (amount as number),
              operation: typeof operation === "string" ? operation : null,
              description: ledger.unlimitedCredits
                ? "unlimited"
                : typeof description === "string" ? description : null,
              broadcastId: typeof broadcastId === "string" ? broadcastId : null,
              messageId: typeof messageId === "string" ? messageId : null,
            },
          });
        } else {
          await tx.creditLedger.update({
            where: { workspaceId: ws.id },
            data: { bonusCredits: ledger.bonusCredits + (amount as number) },
          });

          return tx.creditTransaction.create({
            data: {
              workspaceId: ws.id,
              type: "credit",
              amount: amount as number,
              balanceAfter: available + (amount as number),
              operation: typeof operation === "string" ? operation : null,
              description: typeof description === "string" ? description : null,
            },
          });
        }
      });
    } catch (e) {
      if (e instanceof Error && e.message === "INSUFFICIENT_CREDITS") {
        return badRequest("Insufficient credits");
      }
      throw e;
    }

    return created({ transaction });
  } catch (e) {
    console.error("[POST /api/credits/transactions]", e);
    return serverError();
  }
}
