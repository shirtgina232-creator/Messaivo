import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok, created } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const broadcasts = await prisma.broadcast.findMany({
      where: {
        workspaceId: ws.id,
        ...(status && { status }),
      },
      include: { _count: { select: { recipients: true } } },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = broadcasts.length > limit;
    const items = hasMore ? broadcasts.slice(0, limit) : broadcasts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return ok({ broadcasts: items, nextCursor });
  } catch (e) {
    console.error("[GET /api/broadcasts]", e);
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { name, message, pageId, templateId, scheduledAt } = body as Record<string, unknown>;
    if (!name || typeof name !== "string" || !name.trim()) return badRequest("name is required");
    if (!message || typeof message !== "string" || !message.trim()) {
      return badRequest("message is required");
    }

    if (pageId) {
      const page = await prisma.facebookPage.findFirst({
        where: { id: pageId as string, workspaceId: ws.id },
        select: { id: true },
      });
      if (!page) return badRequest("Invalid pageId");
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        workspaceId: ws.id,
        name: name.trim(),
        message: message.trim(),
        pageId: typeof pageId === "string" ? pageId : null,
        templateId: typeof templateId === "string" ? templateId : null,
        scheduledAt: typeof scheduledAt === "string" ? new Date(scheduledAt) : null,
        status: "draft",
      },
    });

    return created({ broadcast });
  } catch (e) {
    console.error("[POST /api/broadcasts]", e);
    return serverError();
  }
}
