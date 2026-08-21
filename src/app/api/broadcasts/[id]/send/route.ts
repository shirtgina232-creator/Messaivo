import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, serverError, ok } from "@/lib/api-helpers";
import { decryptToken } from "@/lib/token-crypto";
import { sendMessengerMessage } from "@/lib/meta-graph";
import { hasMessageCredit } from "@/lib/credits-server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;

    // Load broadcast with page token and all pending recipients
    const broadcast = await prisma.broadcast.findFirst({
      where: { id, workspaceId: ws.id },
      include: {
        recipients: {
          where: { status: "pending" },
          include: {
            contact: {
              select: { id: true, metaUserId: true, isSubscribed: true },
            },
          },
        },
      },
    });

    if (!broadcast) return notFound("Broadcast not found");

    if (broadcast.status !== "draft" && broadcast.status !== "scheduled") {
      return badRequest(`Cannot send a broadcast with status "${broadcast.status}"`);
    }

    if (!broadcast.pageId) {
      return badRequest("Broadcast has no associated Facebook Page");
    }

    if (broadcast.recipients.length === 0) {
      return badRequest("No pending recipients to send to");
    }

    // Load the page's encrypted access token
    const page = await prisma.facebookPage.findFirst({
      where: { id: broadcast.pageId, workspaceId: ws.id },
      select: { id: true, pageId: true, accessToken: true, isActive: true },
    });

    if (!page) return badRequest("Associated Facebook Page not found");
    if (!page.isActive) return badRequest("The Facebook Page is not active");

    // Pre-flight credit check
    const creditOk = await hasMessageCredit(ws.id);
    if (!creditOk) {
      return badRequest("Insufficient credits. Please upgrade your plan or purchase additional credits.");
    }

    // Decrypt token server-side only — never returned to client
    const plainToken = decryptToken(page.accessToken);

    // Mark broadcast as sending
    await prisma.broadcast.update({
      where: { id },
      data: { status: "sending", startedAt: new Date() },
    });

    const sentAt = new Date();
    let sentCount = 0;
    let failedCount = 0;
    const sentRecipientIds: string[] = [];
    const failedUpdates: Array<{ rid: string; reason: string }> = [];

    // Send to each recipient sequentially
    for (const recipient of broadcast.recipients) {
      if (!recipient.contact.isSubscribed) {
        failedCount++;
        failedUpdates.push({
          rid: recipient.id,
          reason: "Contact is unsubscribed",
        });
        continue;
      }

      const result = await sendMessengerMessage(
        plainToken,
        page.pageId,
        recipient.contact.metaUserId,
        broadcast.message,
      );

      if (result.error) {
        failedCount++;
        failedUpdates.push({
          rid: recipient.id,
          reason: result.error.slice(0, 500),
        });
      } else {
        sentCount++;
        sentRecipientIds.push(recipient.id);
        // Update individual recipient with Meta message ID
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: { status: "sent", sentAt, metaMessageId: result.messageId },
        });
      }
    }

    // Bulk-update failed recipients
    for (const { rid, reason } of failedUpdates) {
      await prisma.broadcastRecipient.update({
        where: { id: rid },
        data: { status: "failed", failureReason: reason },
      });
    }

    const finalStatus = sentCount > 0 ? "completed" : "failed";

    // Deduct credits in one transaction — one credit per successfully sent message
    if (sentCount > 0) {
      const ledger = await prisma.creditLedger.findUnique({ where: { workspaceId: ws.id } });
      if (ledger && !ledger.unlimitedCredits) {
        const balanceAfter =
          ledger.monthlyAllocation + ledger.bonusCredits -
          ledger.usedThisPeriod - sentCount;
        await prisma.$transaction([
          prisma.creditLedger.update({
            where: { workspaceId: ws.id },
            data: { usedThisPeriod: { increment: sentCount } },
          }),
          prisma.creditTransaction.create({
            data: {
              workspaceId: ws.id,
              type: "DEDUCTION",
              operation: "BROADCAST_SEND",
              amount: -sentCount,
              balanceAfter: Math.max(0, balanceAfter),
              pageId: page.id,
            },
          }),
        ]);
      }
    }

    // Finalize broadcast record
    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        sent: sentCount,
        failed: failedCount,
        creditsUsed: sentCount,
      },
    });

    console.log(
      `[broadcasts/send] id=${id} sent=${sentCount} failed=${failedCount} status=${finalStatus}`,
    );

    return ok({
      status: finalStatus,
      sent: sentCount,
      failed: failedCount,
      total: broadcast.recipients.length,
      broadcast: updated,
    });
  } catch (e) {
    console.error("[POST /api/broadcasts/[id]/send]", e);
    // Attempt to reset stuck "sending" status on unhandled error
    const { id } = await params;
    try {
      await prisma.broadcast.updateMany({
        where: { id, status: "sending" },
        data: { status: "draft" },
      });
    } catch { /* ignore recovery failure */ }
    return serverError();
  }
}
