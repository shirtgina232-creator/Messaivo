import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, serverError, ok } from "@/lib/api-helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;

    const broadcast = await prisma.broadcast.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true, status: true, sent: true, failed: true, ineligibleCount: true, skippedCount: true },
    });

    if (!broadcast) return notFound("Broadcast not found");

    // Only "sending" broadcasts can be cancelled
    if (broadcast.status !== "sending") {
      return badRequest(`Cannot cancel a broadcast with status "${broadcast.status}". Only broadcasts currently sending can be cancelled.`);
    }

    // Count how many pending recipients will be skipped
    const pendingCount = await prisma.broadcastRecipient.count({
      where: { broadcastId: id, status: "pending" },
    });

    // Mark all pending recipients as cancelled in one query
    await prisma.broadcastRecipient.updateMany({
      where: { broadcastId: id, status: "pending" },
      data: {
        status: "failed",
        failureReason: "Broadcast cancelled by user",
      },
    });

    // Cancel any queued or processing BroadcastJobs for this broadcast
    await prisma.broadcastJob.updateMany({
      where: {
        broadcastId: id,
        status: { in: ["queued", "processing"] },
      },
      data: {
        status: "cancelled",
        lockedAt: null,
        lockedBy: null,
        lastError: "Broadcast cancelled by user",
      },
    });

    // Update the broadcast itself to cancelled
    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        status: "cancelled",
        completedAt: new Date(),
        failed: { increment: pendingCount },
      },
    });

    return ok({
      broadcast: updated,
      cancelledCount: pendingCount,
      deliveredBeforeCancel: broadcast.sent ?? 0,
    });
  } catch (e) {
    console.error("[POST /api/broadcasts/[id]/cancel]", e);
    return serverError();
  }
}
