import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok, created } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? "";
    const pageId = url.searchParams.get("pageId") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const contacts = await prisma.contact.findMany({
      where: {
        workspaceId: ws.id,
        ...(pageId && { pageId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { metaUserId: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = contacts.length > limit;
    const items = hasMore ? contacts.slice(0, limit) : contacts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return ok({ contacts: items, nextCursor });
  } catch (e) {
    console.error("[GET /api/contacts]", e);
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

    const { metaUserId, name, firstName, lastName, pageId, notes, tags } =
      body as Record<string, unknown>;

    if (!metaUserId || typeof metaUserId !== "string") {
      return badRequest("metaUserId is required");
    }

    if (pageId) {
      const page = await prisma.facebookPage.findFirst({
        where: { id: pageId as string, workspaceId: ws.id },
        select: { id: true },
      });
      if (!page) return badRequest("Invalid pageId");
    }

    const contact = await prisma.contact.create({
      data: {
        workspaceId: ws.id,
        metaUserId,
        name: typeof name === "string" ? name : null,
        firstName: typeof firstName === "string" ? firstName : null,
        lastName: typeof lastName === "string" ? lastName : null,
        pageId: typeof pageId === "string" ? pageId : null,
        notes: typeof notes === "string" ? notes : null,
        tags: Array.isArray(tags) ? (tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
      },
    });

    return created({ contact });
  } catch (e) {
    console.error("[POST /api/contacts]", e);
    return serverError();
  }
}
