import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, serverError, ok } from "@/lib/api-helpers";

function buildPoints(
  conversations: { lastMessageAt: Date | null; createdAt: Date }[],
  range: string,
) {
  const now = Date.now();
  const DAY = 86_400_000;

  if (range === "7d") {
    return Array.from({ length: 7 }, (_, i) => {
      const start = new Date(now - (6 - i) * DAY);
      start.setHours(0, 0, 0, 0);
      const end = start.getTime() + DAY;
      const label = start.toLocaleDateString("en-US", { weekday: "short" });
      const count = conversations.filter(c => {
        const t = (c.lastMessageAt ?? c.createdAt).getTime();
        return t >= start.getTime() && t < end;
      }).length;
      return { label, conversations: count };
    });
  }

  if (range === "30d") {
    return Array.from({ length: 4 }, (_, i) => {
      const start = new Date(now - (3 - i) * 7 * DAY);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 7 * DAY);
      const count = conversations.filter(c => {
        const t = (c.lastMessageAt ?? c.createdAt).getTime();
        return t >= start.getTime() && t < end.getTime();
      }).length;
      return { label: `W${i + 1}`, conversations: count };
    });
  }

  // 90d — last 3 calendar months
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - (2 - i));
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setMonth(end.getMonth() + 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const count = conversations.filter(c => {
      const t = (c.lastMessageAt ?? c.createdAt).getTime();
      return t >= d.getTime() && t < end.getTime();
    }).length;
    return { label, conversations: count };
  });
}

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const range = url.searchParams.get("range") ?? "7d";
    const pageId = url.searchParams.get("pageId") ?? undefined;

    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 86_400_000);

    const [conversations, totalContacts, broadcastCount, openCount] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          workspaceId: ws.id,
          ...(pageId && { pageId }),
          OR: [
            { lastMessageAt: { gte: since } },
            { createdAt: { gte: since } },
          ],
        },
        select: { createdAt: true, lastMessageAt: true, unreadCount: true },
        orderBy: { createdAt: "asc" },
        take: 1000,
      }),
      prisma.contact.count({ where: { workspaceId: ws.id } }),
      prisma.broadcast.count({ where: { workspaceId: ws.id } }),
      prisma.conversation.count({ where: { workspaceId: ws.id, status: "open" } }),
    ]);

    const points = buildPoints(conversations, range);
    const totalInPeriod = conversations.length;
    const responded = conversations.filter(c => c.unreadCount === 0).length;
    const responseRate = totalInPeriod > 0 ? Math.round((responded / totalInPeriod) * 100) : 0;

    return ok({ points, totalContacts, broadcastCount, openCount, totalInPeriod, responseRate });
  } catch (e) {
    console.error("[GET /api/analytics]", e);
    return serverError();
  }
}
