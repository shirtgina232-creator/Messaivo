import crypto from "crypto";
import { prisma } from "@/lib/db";

// ── Meta webhook payload types ─────────────────────────────────────────────────

type MetaAttachment = { type: string; payload: { url?: string } };
type MetaMessage = {
  mid: string;
  text?: string;
  attachments?: MetaAttachment[];
  is_echo?: boolean;
};
type MetaDelivery = { watermark: number; mids?: string[] };
type MetaRead = { watermark: number };

type MetaMessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: MetaMessage;
  delivery?: MetaDelivery;
  read?: MetaRead;
  // Opt-outs can arrive as a keyword message ("STOP") or as an explicit optout event
  optin?: Record<string, unknown>;
};
type MetaEntry = { id: string; time: number; messaging: MetaMessagingEvent[] };
type MetaWebhookPayload = { object: string; entry: MetaEntry[] };

// ── GET — Meta webhook subscription verification ───────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    return new Response("META_WEBHOOK_VERIFY_TOKEN is not configured", { status: 503 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ── POST — Incoming Meta webhook events ───────────────────────────────────────

export async function POST(req: Request) {
  const appSecret = process.env.META_APP_SECRET;
  let payload: MetaWebhookPayload;

  if (appSecret) {
    const signature = req.headers.get("x-hub-signature-256");
    if (!signature) {
      return new Response("Missing x-hub-signature-256 header", { status: 400 });
    }

    const rawBody = await req.text();
    const expected =
      "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

    if (signature !== expected) {
      return new Response("Invalid signature", { status: 403 });
    }

    try {
      payload = JSON.parse(rawBody) as MetaWebhookPayload;
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }
  } else {
    console.warn("[Meta webhook] META_APP_SECRET not configured; skipping signature check (dev only)");
    try {
      payload = (await req.json()) as MetaWebhookPayload;
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }
  }

  if (payload.object !== "page") {
    return new Response("OK", { status: 200 });
  }

  // Respond to Meta immediately — process events in the same request but don't let
  // any single event failure block the 200 response Meta needs within 20 seconds.
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      try {
        await handleMessagingEvent(event);
      } catch (err) {
        console.error("[Meta webhook] Event handling error:", err, JSON.stringify(event));
      }
    }
  }

  return new Response("OK", { status: 200 });
}

// ── Event handler ──────────────────────────────────────────────────────────────

async function handleMessagingEvent(event: MetaMessagingEvent): Promise<void> {
  const { sender, recipient, timestamp, message, delivery, read } = event;

  // ── Inbound message ───────────────────────────────────────────────────────────
  if (message) {
    // Skip echo events (messages sent by the Page via API, echoed back to webhook)
    if (message.is_echo) return;

    const page = await prisma.facebookPage.findFirst({
      where: { pageId: recipient.id, isActive: true },
      select: { id: true, workspaceId: true },
    });
    if (!page) {
      console.warn(`[Meta webhook] Received message for unknown/inactive page ${recipient.id}`);
      return;
    }

    // Upsert contact
    const contact = await prisma.contact.upsert({
      where: {
        workspaceId_metaUserId: { workspaceId: page.workspaceId, metaUserId: sender.id },
      },
      update: {
        lastMessageAt: new Date(timestamp),
        totalMessages: { increment: 1 },
        isSubscribed: true, // any inbound message re-subscribes the contact
      },
      create: {
        workspaceId:  page.workspaceId,
        pageId:       page.id,
        metaUserId:   sender.id,
        lastMessageAt: new Date(timestamp),
        totalMessages: 1,
        isSubscribed: true,
      },
    });

    // Upsert conversation — re-open and bump unread on new message
    const conversation = await prisma.conversation.upsert({
      where: { pageId_contactId: { pageId: page.id, contactId: contact.id } },
      update: {
        lastMessageAt: new Date(timestamp),
        unreadCount: { increment: 1 },
        status: "open",
      },
      create: {
        workspaceId:  page.workspaceId,
        pageId:       page.id,
        contactId:    contact.id,
        lastMessageAt: new Date(timestamp),
        unreadCount:  1,
      },
    });

    // Deduplicate — Meta can re-deliver on retry
    if (message.mid) {
      const dup = await prisma.message.findUnique({
        where: { metaMessageId: message.mid },
        select: { id: true },
      });
      if (dup) return;
    }

    const msgText = message.text ?? null;

    // Check for opt-out keyword (case-insensitive STOP)
    if (msgText && /^\s*stop\s*$/i.test(msgText)) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { isSubscribed: false },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        metaMessageId:  message.mid ?? null,
        direction:      "inbound",
        messageType:    message.attachments ? "attachment" : "text",
        content:        msgText,
        attachmentUrl:  message.attachments?.[0]?.payload?.url ?? null,
        status:         "delivered",
        sentAt:         new Date(timestamp),
      },
    });
    return;
  }

  // ── Delivery receipt ──────────────────────────────────────────────────────────
  if (delivery) {
    const pageAndConv = await resolvePageConversation(recipient.id, sender.id);
    if (!pageAndConv) return;

    await prisma.message.updateMany({
      where: {
        conversationId: pageAndConv.conversationId,
        direction:      "outbound",
        status:         "sent",
        sentAt:         { lte: new Date(delivery.watermark) },
      },
      data: {
        status:      "delivered",
        deliveredAt: new Date(),
      },
    });
    return;
  }

  // ── Read receipt ──────────────────────────────────────────────────────────────
  if (read) {
    const pageAndConv = await resolvePageConversation(recipient.id, sender.id);
    if (!pageAndConv) return;

    await prisma.message.updateMany({
      where: {
        conversationId: pageAndConv.conversationId,
        direction:      "outbound",
        status:         { in: ["sent", "delivered"] },
        sentAt:         { lte: new Date(read.watermark) },
      },
      data: {
        status: "read",
        readAt: new Date(),
      },
    });

    // Clear unread count on conversation when the user reads our messages
    await prisma.conversation.update({
      where: { id: pageAndConv.conversationId },
      data: { unreadCount: 0 },
    });
    return;
  }
}

// ── Helper: find conversation from page ID and user PSID ──────────────────────

async function resolvePageConversation(
  metaPageId: string,
  userPsid: string,
): Promise<{ conversationId: string } | null> {
  const page = await prisma.facebookPage.findFirst({
    where: { pageId: metaPageId, isActive: true },
    select: { id: true, workspaceId: true },
  });
  if (!page) return null;

  const contact = await prisma.contact.findFirst({
    where: { workspaceId: page.workspaceId, metaUserId: userPsid },
    select: { id: true },
  });
  if (!contact) return null;

  const conversation = await prisma.conversation.findFirst({
    where: { pageId: page.id, contactId: contact.id },
    select: { id: true },
  });
  if (!conversation) return null;

  return { conversationId: conversation.id };
}
