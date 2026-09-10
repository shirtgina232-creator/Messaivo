import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, serverError, ok } from "@/lib/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;

    const broadcast = await prisma.broadcast.findFirst({
      where: { id, workspaceId: ws.id },
      select: {
        id: true,
        status: true,
        totalRecipients: true,
        sent: true,
        failed: true,
        ineligibleCount: true,
        skippedCount: true,
        creditsUsed: true,
        startedAt: true,
        completedAt: true,
        broadcastJob: {
          select: {
            id: true,
            status: true,
            batchSize: true,
            attemptCount: true,
            lastAttemptAt: true,
            lastError: true,
            scheduledFor: true,
          },
        },
      },
    });

    if (!broadcast) return notFound("Broadcast not found");

    const processed = broadcast.sent + broadcast.failed;
    const total = broadcast.totalRecipients || 1;
    const percentComplete = Math.min(100, Math.round((processed / total) * 100));

    // Estimate time remaining based on average throughput so far
    let estimatedSecondsLeft: number | null = null;
    if (broadcast.status === "sending" && broadcast.startedAt && processed > 0) {
      const elapsedMs = Date.now() - new Date(broadcast.startedAt).getTime();
      const msPerRecipient = elapsedMs / processed;
      const remaining = total - processed;
      estimatedSecondsLeft = Math.round((remaining * msPerRecipient) / 1000);
    }

    return ok({
      broadcastId: broadcast.id,
      status: broadcast.status,
      total: broadcast.totalRecipients,
      sent: broadcast.sent,
      failed: broadcast.failed,
      ineligible: broadcast.ineligibleCount,
      skipped: broadcast.skippedCount,
      creditsUsed: broadcast.creditsUsed,
      processed,
      percentComplete,
      estimatedSecondsLeft,
      job: broadcast.broadcastJob
        ? {
            status: broadcast.broadcastJob.status,
            batchSize: broadcast.broadcastJob.batchSize,
            attemptCount: broadcast.broadcastJob.attemptCount,
            lastAttemptAt: broadcast.broadcastJob.lastAttemptAt,
            scheduledFor: broadcast.broadcastJob.scheduledFor,
            lastError: broadcast.broadcastJob.lastError,
          }
        : null,
    });
  } catch (e) {
    console.error("[GET /api/broadcasts/[id]/progress]", e);
    return serverError();
  }
}
