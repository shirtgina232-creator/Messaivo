import { prisma } from "@/lib/db";
import { prepareBroadcast, prepareRecipient } from "@/lib/broadcast-policy";
import { sendPayload } from "@/lib/meta-graph";
import type { Broadcast, Contact } from "@prisma/client";

export async function deliverRecipient(broadcast: Broadcast, contact: Contact, prepared: Awaited<ReturnType<typeof prepareBroadcast>>, requestKey: string, recipientId?: string) {
  const message = prepareRecipient(broadcast, contact, prepared);
  const attempt = await prisma.$transaction(async tx => {
    // Cancellation and admission serialize on the broadcast. No new send starts after cancellation.
    await tx.$queryRaw`SELECT id FROM "Broadcast" WHERE id = ${broadcast.id} FOR UPDATE`;
    const current = await tx.broadcast.findUniqueOrThrow({ where: { id: broadcast.id } });
    if (recipientId ? current.status !== "sending" : !["draft", "scheduled"].includes(current.status)) throw new Error("Broadcast is no longer sendable");
    const prior = await tx.messagingAttempt.findUnique({ where: { workspaceId_requestKey: { workspaceId: broadcast.workspaceId, requestKey } } });
    if (prior) return prior;
    const freshContact = await tx.contact.findUniqueOrThrow({ where: { id: contact.id } });
    prepareRecipient(current, freshContact, prepared);
    const activePage = await tx.facebookPage.findFirst({ where: { id: prepared.page.id, workspaceId: broadcast.workspaceId, isActive: true } });
    if (!activePage) throw new Error("Page disconnected");
    await tx.$queryRaw`SELECT id FROM "CreditLedger" WHERE "workspaceId" = ${broadcast.workspaceId} FOR UPDATE`;
    const ledger = await tx.creditLedger.findUnique({ where: { workspaceId: broadcast.workspaceId } });
    if (!ledger || (!ledger.unlimitedCredits && ledger.monthlyAllocation + ledger.bonusCredits - ledger.usedThisPeriod < 1)) throw new Error("Insufficient credits");
    if (recipientId) {
      const claim = await tx.broadcastRecipient.updateMany({ where: { id: recipientId, broadcastId: broadcast.id, contactId: contact.id, status: "pending" }, data: { status: "processing", sendStartedAt: new Date(), attemptCount: { increment: 1 } } });
      if (!claim.count) throw new Error("Recipient already claimed");
    }
    if (!ledger.unlimitedCredits) await tx.creditLedger.update({ where: { workspaceId: broadcast.workspaceId }, data: { usedThisPeriod: { increment: 1 } } });
    return tx.messagingAttempt.create({ data: { workspaceId: broadcast.workspaceId, pageId: prepared.page.id, contactId: contact.id, broadcastId: broadcast.id, recipientId, requestKey, payload: message.payload, charged: !ledger.unlimitedCredits } });
  });
  // Existing attempts must never be resent (including concurrent Test Send requests).
  // The creator's random ownership token is encoded in the new request key by callers;
  // ownership itself is established below with a compare-and-swap transition.
  const claim = await prisma.messagingAttempt.updateMany({ where: { id: attempt.id, status: "processing" }, data: { status: "dispatching" } });
  if (!claim.count) return { success: attempt.status === "sent", error: attempt.error || "Request already submitted; check delivery status", uncertain: attempt.status !== "sent" };
  const result = await sendPayload(prepared.token, prepared.page.pageId, attempt.payload);
  const sent = !!result.messageId;
  const status = sent ? "sent" : result.uncertain ? "unknown" : "failed";
  await prisma.$transaction(async tx => {
    await tx.messagingAttempt.update({ where: { id: attempt.id }, data: { status, metaMessageId: result.messageId, error: result.error, finishedAt: new Date() } });
    if (attempt.charged && status === "failed") await tx.creditLedger.update({ where: { workspaceId: broadcast.workspaceId }, data: { usedThisPeriod: { decrement: 1 } } });
    if (sent) {
      const conversation = await tx.conversation.upsert({ where: { pageId_contactId: { pageId: prepared.page.id, contactId: contact.id } }, create: { workspaceId: broadcast.workspaceId, pageId: prepared.page.id, contactId: contact.id }, update: {} });
      await tx.message.create({ data: { conversationId: conversation.id, metaMessageId: result.messageId, direction: "outbound", content: message.text, sentAt: new Date(), status: "sent", creditsUsed: attempt.charged ? 1 : 0 } });
      if (attempt.charged) {
        const ledger = await tx.creditLedger.findUniqueOrThrow({ where: { workspaceId: broadcast.workspaceId } });
        await tx.creditTransaction.create({ data: { workspaceId: broadcast.workspaceId, pageId: prepared.page.id, broadcastId: broadcast.id, messageId: result.messageId, type: "DEDUCTION", operation: recipientId ? "BROADCAST_SEND" : "TEST_SEND", amount: -1, balanceAfter: ledger.monthlyAllocation + ledger.bonusCredits - ledger.usedThisPeriod } });
      }
    }
    if (recipientId) {
      const row = await tx.broadcastRecipient.findUniqueOrThrow({ where: { id: recipientId } });
      const running = await tx.broadcast.findUniqueOrThrow({ where: { id: broadcast.id } });
      const retry = !sent && !result.uncertain && result.retryable && row.attemptCount < 5 && running.status === "sending";
      await tx.broadcastRecipient.update({ where: { id: recipientId }, data: { status: retry ? "pending" : status, attemptId: attempt.id, metaMessageId: result.messageId, sentAt: sent ? new Date() : null, failureReason: result.error, nextAttemptAt: retry ? new Date(Date.now() + Math.min(900000, 30000 * 2 ** row.attemptCount) + Math.random() * 5000) : null } });
    }
  });
  return { success: sent, error: result.error, uncertain: !!result.uncertain };
}

export async function updateBroadcastCounts(id: string) {
  const [rows, attempts] = await Promise.all([
    prisma.broadcastRecipient.groupBy({ by: ["status"], where: { broadcastId: id }, _count: true }),
    prisma.messagingAttempt.count({ where: { broadcastId: id, recipientId: { not: null }, status: "sent", charged: true } }),
  ]);
  const counts = Object.fromEntries(rows.map(r => [r.status, r._count]));
  await prisma.broadcast.update({ where: { id }, data: { sent: (counts.sent || 0) + (counts.delivered || 0) + (counts.read || 0), delivered: (counts.delivered || 0) + (counts.read || 0), read: counts.read || 0, failed: (counts.failed || 0) + (counts.skipped || 0) + (counts.cancelled || 0), skippedCount: counts.skipped || 0, creditsUsed: attempts } });
  return counts;
}
