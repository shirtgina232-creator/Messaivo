import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, ok } from "@/lib/api-helpers";
import { updateBroadcastCounts } from "@/lib/broadcast-delivery";
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ws = await getWorkspace(); if (!ws) return unauthorized(); const { id } = await params;
  const found = await prisma.broadcast.findFirst({ where: { id, workspaceId: ws.id } }); if (!found) return notFound();
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Broadcast" WHERE id = ${id} FOR UPDATE`;
    await tx.broadcast.updateMany({ where: { id, workspaceId: ws.id, status: { in: ["draft", "scheduled", "sending", "needs_review"] } }, data: { status: "cancelled", completedAt: new Date() } });
    await tx.broadcastJob.updateMany({ where: { broadcastId: id, status: { in: ["queued", "processing"] } }, data: { status: "cancelled", lockedBy: null, lockedAt: null } });
    await tx.broadcastRecipient.updateMany({ where: { broadcastId: id, status: "pending" }, data: { status: "cancelled", failureReason: "Cancelled before dispatch" } });
  });
  await updateBroadcastCounts(id); return ok({ cancelled: true, message: "Pending sends cancelled; in-flight sends may still complete" });
}
