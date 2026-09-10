import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, ok } from "@/lib/api-helpers";
import { hasMessageCredit } from "@/lib/credits-server";

export async function POST(
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
        pageId: true,
        scheduledAt: true,
        totalRecipients: true,
        broadcastJob: { select: { id: true, status: true } },
        _count: { select: { recipients: { where: { status: "pending" } } } },
      },
    });

    if (!broadcast) return notFound("Broadcast not found");

    if (broadcast.status !== "draft" && broadcast.status !== "scheduled") {
      return badRequest(`Cannot send a broadcast with status "${broadcast.status}"`);
    }

    if (!broadcast.pageId) {
      return badRequest("Broadcast has no associated Facebook Page");
    }

    if (broadcast._count.recipients === 0) {
      return badRequest("No pending recipients to send to");
    }

    const page = await prisma.facebookPage.findFirst({
      where: { id: broadcast.pageId, workspaceId: ws.id },
      select: { id: true, isActive: true },
    });

    if (!page) return badRequest("Associated Facebook Page not found");
    if (!page.isActive) return badRequest("The Facebook Page is not active");

    const creditOk = await hasMessageCredit(ws.id);
    if (!creditOk) {
      return badRequest("Insufficient credits. Please upgrade your plan or purchase additional credits.");
    }

    // If a prior job exists and is done/cancelled, delete it so we can create a fresh one
    if (broadcast.broadcastJob && (broadcast.broadcastJob.status === "completed" || broadcast.broadcastJob.status === "failed" || broadcast.broadcastJob.status === "cancelled")) {
      await prisma.broadcastJob.delete({ where: { id: broadcast.broadcastJob.id } });
    } else if (broadcast.broadcastJob && (broadcast.broadcastJob.status === "queued" || broadcast.broadcastJob.status === "processing")) {
      return badRequest("This broadcast is already queued for delivery.");
    }

    // Determine when the job should first run
    const scheduledFor = broadcast.scheduledAt && broadcast.scheduledAt > new Date()
      ? broadcast.scheduledAt
      : new Date();

    // Mark broadcast as sending and create the delivery job atomically
    await prisma.$transaction([
      prisma.broadcast.update({
        where: { id },
        data: { status: "sending", startedAt: new Date() },
      }),
      prisma.broadcastJob.create({
        data: {
          broadcastId: id,
          status: "queued",
          batchSize: 50,
          scheduledFor,
        },
      }),
    ]);

    return ok({
      queued: true,
      scheduledFor,
      message: broadcast.scheduledAt && broadcast.scheduledAt > new Date()
        ? `Broadcast scheduled for ${broadcast.scheduledAt.toISOString()}`
        : "Broadcast queued for immediate delivery. The first batch will be processed within 60 seconds.",
    });
  } catch (e) {
    console.error("[POST /api/broadcasts/[id]/send]", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
