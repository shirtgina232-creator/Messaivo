import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, serverError, ok, created } from "@/lib/api-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id: conversationId } = await params;
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId: ws.id },
      select: { id: true },
    });
    if (!conversation) return notFound("Conversation not found");

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return ok({ messages: items, nextCursor });
  } catch (e) {
    console.error("[GET /api/conversations/[id]/messages]", e);
    return serverError();
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id: conversationId } = await params;
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId: ws.id },
      select: { id: true, pageId: true },
    });
    if (!conversation) return notFound("Conversation not found");

    // Block outbound sends until Meta credentials are configured
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
      return badRequest(
        "Meta credentials are not configured. Set META_APP_ID and META_APP_SECRET in .env.local."
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { content, messageType } = body as Record<string, unknown>;
    if (!content || typeof content !== "string" || !content.trim()) {
      return badRequest("content is required");
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        direction: "outbound",
        messageType: typeof messageType === "string" ? messageType : "text",
        content: content.trim(),
        status: "queued",
        sentAt: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // TODO: enqueue actual Meta Messenger send once Meta integration is active

    return created({ message });
  } catch (e) {
    console.error("[POST /api/conversations/[id]/messages]", e);
    return serverError();
  }
}
