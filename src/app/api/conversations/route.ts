import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok, created } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const pageId = url.searchParams.get("pageId") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId: ws.id,
        ...(status && { status }),
        ...(pageId && { pageId }),
      },
      include: {
        contact: { select: { id: true, name: true, firstName: true, lastName: true, profilePicUrl: true } },
        page: { select: { id: true, pageName: true, pageAvatar: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = conversations.length > limit;
    const items = hasMore ? conversations.slice(0, limit) : conversations;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return ok({ conversations: items, nextCursor });
  } catch (e) {
    console.error("[GET /api/conversations]", e);
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

    const { contactId, pageId, metaThreadId } = body as Record<string, unknown>;
    if (!contactId || typeof contactId !== "string") return badRequest("contactId is required");
    if (!pageId || typeof pageId !== "string") return badRequest("pageId is required");

    const [contact, page] = await Promise.all([
      prisma.contact.findFirst({ where: { id: contactId, workspaceId: ws.id }, select: { id: true } }),
      prisma.facebookPage.findFirst({ where: { id: pageId, workspaceId: ws.id }, select: { id: true } }),
    ]);
    if (!contact) return badRequest("Invalid contactId");
    if (!page) return badRequest("Invalid pageId");

    const conversation = await prisma.conversation.upsert({
      where: { pageId_contactId: { pageId, contactId } },
      update: {},
      create: {
        workspaceId: ws.id,
        pageId,
        contactId,
        metaThreadId: typeof metaThreadId === "string" ? metaThreadId : null,
      },
    });

    return created({ conversation });
  } catch (e) {
    console.error("[POST /api/conversations]", e);
    return serverError();
  }
}
