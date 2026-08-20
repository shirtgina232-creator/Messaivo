import { prisma } from "@/lib/db";
import {
  getWorkspace, unauthorized, notFound, badRequest, serverError, ok, created,
} from "@/lib/api-helpers";
import { decryptToken } from "@/lib/token-crypto";
import { sendMessengerMessage, META_ERR_WINDOW_EXPIRED } from "@/lib/meta-graph";
import { hasMessageCredit, deductMessageCredit } from "@/lib/credits-server";

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

    // Load conversation with page token and contact PSID — all server-side only
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId: ws.id },
      select: {
        id: true,
        page: {
          select: {
            id: true,
            pageId: true,   // Meta page ID
            accessToken: true,
            isActive: true,
          },
        },
        contact: {
          select: {
            id: true,
            metaUserId: true,
            isSubscribed: true,
          },
        },
      },
    });
    if (!conversation) return notFound("Conversation not found");

    if (!conversation.page.isActive) {
      return badRequest("The Facebook Page for this conversation is not active.");
    }

    if (!conversation.contact.isSubscribed) {
      return badRequest(
        "This contact has opted out of messages. They must message your Page again to resubscribe."
      );
    }

    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
      return badRequest(
        "Meta credentials are not configured. Set META_APP_ID and META_APP_SECRET in .env.local."
      );
    }

    // Pre-flight credit check
    const creditOk = await hasMessageCredit(ws.id);
    if (!creditOk) {
      return badRequest("Insufficient credits. Please upgrade your plan or purchase additional credits.");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { content, messageType, templateId } = body as Record<string, unknown>;
    if (!content || typeof content !== "string" || !content.trim()) {
      return badRequest("content is required");
    }

    // Decrypt the page access token — never leaves the server
    const plainToken = decryptToken(conversation.page.accessToken);

    // Create the message record as 'queued' before calling Meta
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

    // Send via Meta Graph API
    const result = await sendMessengerMessage(
      plainToken,
      conversation.page.pageId,
      conversation.contact.metaUserId,
      content.trim(),
    );

    if (result.error) {
      // Mark message as failed and surface a clean error
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "failed" },
      });

      const userMsg = result.errorCode === META_ERR_WINDOW_EXPIRED
        ? "The 24-hour messaging window has closed. The contact must message your Page first to reopen it."
        : `Message delivery failed: ${result.error}`;

      console.error(
        `[messages/POST] Meta send failed for conversation ${conversationId}:`,
        result.error, `(code ${result.errorCode})`
      );
      return badRequest(userMsg);
    }

    // Update message to sent with Meta's message ID
    const sentMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "sent",
        metaMessageId: result.messageId,
      },
    });

    // Update conversation last-message timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Deduct credit (non-blocking — failure here is logged but does not fail the request)
    deductMessageCredit(ws.id, message.id, conversation.page.id).catch(err => {
      console.error("[messages/POST] Credit deduction failed:", err);
    });

    // Increment template usageCount if this message was sent using a template
    if (typeof templateId === "string" && templateId) {
      prisma.messageTemplate.updateMany({
        where: { id: templateId, workspaceId: ws.id },
        data: { usageCount: { increment: 1 } },
      }).catch(err => {
        console.error("[messages/POST] Template usageCount increment failed:", err);
      });
    }

    return created({ message: sentMessage });
  } catch (e) {
    console.error("[POST /api/conversations/[id]/messages]", e);
    return serverError();
  }
}
