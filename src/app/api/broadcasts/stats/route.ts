import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, serverError, ok } from "@/lib/api-helpers";

// Summary statistics for the Utility Message Center dashboard.
export async function GET() {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const [templateStats, broadcastAgg, recentBroadcasts, recentTemplates] = await Promise.all([
      // Template counts grouped by status
      prisma.messageTemplate.groupBy({
        by: ["status"],
        where: { workspaceId: ws.id },
        _count: { id: true },
      }),

      // All-time broadcast delivery totals
      prisma.broadcast.aggregate({
        where: { workspaceId: ws.id },
        _sum: { sent: true, failed: true, totalRecipients: true, ineligibleCount: true, skippedCount: true, creditsUsed: true },
        _count: { id: true },
      }),

      // 6 most recent broadcasts for campaign history
      prisma.broadcast.findMany({
        where: { workspaceId: ws.id },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true, name: true, status: true, templateName: true,
          totalRecipients: true, sent: true, failed: true, ineligibleCount: true,
          createdAt: true, completedAt: true, startedAt: true, scheduledAt: true,
          pageId: true,
        },
      }),

      // 8 most recent template changes for activity feed
      prisma.messageTemplate.findMany({
        where: { workspaceId: ws.id },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: { id: true, name: true, status: true, updatedAt: true, createdAt: true },
      }),
    ]);

    // Build template counts
    const tplByStatus = Object.fromEntries(
      templateStats.map(g => [g.status, g._count.id])
    );
    const totalTemplates   = templateStats.reduce((sum, g) => sum + g._count.id, 0);
    const availableToSend  = tplByStatus["approved"] ?? 0;
    const draftTemplates   = tplByStatus["draft"] ?? 0;
    const pendingReview    = tplByStatus["pending_review"] ?? 0;
    const rejectedTemplates = tplByStatus["rejected"] ?? 0;
    const disabledTemplates = tplByStatus["disabled"] ?? 0;

    // Broadcast totals
    const totalCampaigns  = broadcastAgg._count.id;
    const totalSent       = broadcastAgg._sum.totalRecipients ?? 0;
    const totalDelivered  = broadcastAgg._sum.sent ?? 0;
    const totalFailed     = (broadcastAgg._sum.failed ?? 0) - (broadcastAgg._sum.ineligibleCount ?? 0) - (broadcastAgg._sum.skippedCount ?? 0);
    const totalSkipped    = (broadcastAgg._sum.ineligibleCount ?? 0) + (broadcastAgg._sum.skippedCount ?? 0);
    const creditsUsed     = broadcastAgg._sum.creditsUsed ?? 0;

    return ok({
      templates: { total: totalTemplates, available: availableToSend, draft: draftTemplates, pendingReview, rejected: rejectedTemplates, disabled: disabledTemplates },
      campaigns: { total: totalCampaigns, totalSent, totalDelivered, totalFailed, totalSkipped, creditsUsed },
      recentBroadcasts,
      recentTemplates,
    });
  } catch (e) {
    console.error("[GET /api/broadcasts/stats]", e);
    return serverError();
  }
}
