import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok, created } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? "";
    const category = url.searchParams.get("category") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const templates = await prisma.messageTemplate.findMany({
      where: {
        workspaceId: ws.id,
        ...(category && { category }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { usageCount: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = templates.length > limit;
    const items = hasMore ? templates.slice(0, limit) : templates;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return ok({ templates: items, nextCursor });
  } catch (e) {
    console.error("[GET /api/templates]", e);
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

    const { name, content, category, tags } = body as Record<string, unknown>;
    if (!name || typeof name !== "string" || !name.trim()) return badRequest("name is required");
    if (!content || typeof content !== "string" || !content.trim()) {
      return badRequest("content is required");
    }

    const template = await prisma.messageTemplate.create({
      data: {
        workspaceId: ws.id,
        name: name.trim(),
        content: content.trim(),
        category: typeof category === "string" ? category : null,
        tags: Array.isArray(tags) ? (tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
      },
    });

    return created({ template });
  } catch (e) {
    console.error("[POST /api/templates]", e);
    return serverError();
  }
}
