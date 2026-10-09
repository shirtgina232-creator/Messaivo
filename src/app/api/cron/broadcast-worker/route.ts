import { randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { prepareBroadcast } from "@/lib/broadcast-policy";
import { deliverRecipient, updateBroadcastCounts } from "@/lib/broadcast-delivery";
export const maxDuration = 60;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET; const header = req.headers.get("authorization") || "";
  if (!secret || header.length !== secret.length + 7 || !timingSafeEqual(Buffer.from(header), Buffer.from("Bearer " + secret))) return new Response("Unauthorized", { status: 401 });
  const worker = randomUUID(); const deadline = Date.now() + 40000;
  const stale = new Date(Date.now() - 120000);
  // A crashed dispatcher may have sent. Quarantine it; never reset it to pending.
  await prisma.messagingAttempt.updateMany({ where: { status: { in: ["processing", "dispatching"] }, createdAt: { lt: stale } }, data: { status: "unknown", error: "Worker interrupted; reconcile before resending" } });
  await prisma.broadcastRecipient.updateMany({ where: { status: "processing", sendStartedAt: { lt: stale } }, data: { status: "unknown", failureReason: "Interrupted send; outcome unknown" } });
  await prisma.broadcastJob.updateMany({ where: { status: "processing", lockedAt: { lt: stale } }, data: { status: "queued", lockedBy: null, lockedAt: null } });
  const candidate = await prisma.broadcastJob.findFirst({ where: { status: "queued", scheduledFor: { lte: new Date() }, broadcast: { status: "sending" } }, orderBy: { scheduledFor: "asc" } });
  if (!candidate) return Response.json({ idle: true });
  const claim = await prisma.broadcastJob.updateMany({ where: { id: candidate.id, status: "queued" }, data: { status: "processing", lockedAt: new Date(), lockedBy: worker, attemptCount: { increment: 1 }, lastAttemptAt: new Date() } });
  if (!claim.count) return Response.json({ claimed: false });
  try {
    const broadcast = await prisma.broadcast.findUniqueOrThrow({ where: { id: candidate.broadcastId } });
    const prepared = await prepareBroadcast(broadcast);
    while (Date.now() < deadline) {
      const running = await prisma.broadcastJob.findFirst({ where: { id: candidate.id, lockedBy: worker, status: "processing", broadcast: { status: "sending" } } });
      if (!running) break;
      const recipient = await prisma.broadcastRecipient.findFirst({ where: { broadcastId: broadcast.id, status: "pending", OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }, include: { contact: true }, orderBy: { id: "asc" } });
      if (!recipient) break;
      await prisma.broadcastJob.updateMany({ where: { id: candidate.id, lockedBy: worker, status: "processing" }, data: { lockedAt: new Date() } });
      try { await deliverRecipient(broadcast, recipient.contact, prepared, recipient.id + ":" + recipient.attemptCount, recipient.id); }
      catch (error) {
        const reason = error instanceof Error ? error.message : "Send admission failed";
        if (reason.includes("credits")) throw error;
        await prisma.broadcastRecipient.updateMany({ where: { id: recipient.id, status: "pending" }, data: { status: "skipped", failureReason: reason } });
        // A persistence error after dispatch leaves processing/unknown untouched.
        const state = await prisma.broadcastRecipient.findUnique({ where: { id: recipient.id } });
        if (state?.status === "processing") throw error;
      }
    }
    const counts = await updateBroadcastCounts(broadcast.id);
    const pending = (counts.pending || 0) + (counts.processing || 0);
    await prisma.$transaction(async tx => {
      const job = await tx.broadcastJob.updateMany({ where: { id: candidate.id, lockedBy: worker, status: "processing" }, data: { status: pending ? "queued" : "completed", scheduledFor: new Date(Date.now() + 60000), lockedAt: null, lockedBy: null, lastError: null } });
      if (job.count && !pending) await tx.broadcast.updateMany({ where: { id: broadcast.id, status: "sending" }, data: { status: counts.unknown ? "needs_review" : "completed", completedAt: new Date() } });
    });
    return Response.json({ processed: true, counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker failed";
    // Keep pending recipients resumable; configuration failures do not discard them.
    await prisma.broadcastJob.updateMany({ where: { id: candidate.id, lockedBy: worker, status: "processing" }, data: { status: "queued", scheduledFor: new Date(Date.now() + 300000), lockedAt: null, lockedBy: null, lastError: message } });
    return Response.json({ deferred: true, error: message });
  }
}
