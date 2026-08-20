import { prisma } from "@/lib/db";

const SEND_MESSAGE_COST = 1;

export interface DeductResult {
  success: boolean;
  reason?: string;
}

/**
 * Deduct one message send credit from the workspace ledger.
 * Writes a CreditTransaction record and updates Message.creditsUsed atomically.
 * Call only after a message is confirmed sent by Meta.
 */
export async function deductMessageCredit(
  workspaceId: string,
  messageId: string,
  pageId?: string,
): Promise<DeductResult> {
  const ledger = await prisma.creditLedger.findUnique({ where: { workspaceId } });
  if (!ledger) return { success: false, reason: "Credit ledger not found" };
  if (ledger.unlimitedCredits) return { success: true };

  const available =
    ledger.monthlyAllocation + ledger.bonusCredits - ledger.usedThisPeriod;
  if (available < SEND_MESSAGE_COST) {
    return { success: false, reason: "Insufficient credits" };
  }

  const balanceAfter =
    ledger.monthlyAllocation + ledger.bonusCredits -
    ledger.usedThisPeriod - SEND_MESSAGE_COST;

  await prisma.$transaction([
    prisma.creditLedger.update({
      where: { workspaceId },
      data: { usedThisPeriod: { increment: SEND_MESSAGE_COST } },
    }),
    prisma.creditTransaction.create({
      data: {
        workspaceId,
        type: "DEDUCTION",
        operation: "SEND_MESSAGE",
        amount: -SEND_MESSAGE_COST,
        balanceAfter,
        messageId,
        pageId: pageId ?? null,
      },
    }),
    prisma.message.update({
      where: { id: messageId },
      data: { creditsUsed: SEND_MESSAGE_COST },
    }),
  ]);

  return { success: true };
}

/**
 * Fast pre-flight credit check — does not deduct.
 * Use before the Graph API call to fail early without wasting the API quota.
 */
export async function hasMessageCredit(workspaceId: string): Promise<boolean> {
  const ledger = await prisma.creditLedger.findUnique({ where: { workspaceId } });
  if (!ledger) return false;
  if (ledger.unlimitedCredits) return true;
  return (ledger.monthlyAllocation + ledger.bonusCredits - ledger.usedThisPeriod) >= SEND_MESSAGE_COST;
}
