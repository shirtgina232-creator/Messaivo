import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type MetaAttachment = { type: string; payload: { url?: string } };
type MetaMessage = { mid: string; text?: string; attachments?: MetaAttachment[] };
type MetaMessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: MetaMessage;
};
type MetaEntry = { id: string; time: number; messaging: MetaMessagingEvent[] };
type MetaWebhookPayload = { object: string; entry: MetaEntry[] };

// GET — Meta webhook subscription verification challenge
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

// POST — Incoming Meta webhook events (Messenger messages)
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
    // META_APP_SECRET not set — accept without verification (dev only)
    console.warn("[Meta webhook] META_APP_SECRET not configured; skipping signature check");
    try {
      payload = (await req.json()) as MetaWebhookPayload;
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }
  }

  if (payload.object !== "page") {
    return new Response("OK", { status: 200 });
  }

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      if (!event.message) continue; // skip read receipts, deliveries, postbacks

      const { sender, recipient, message, timestamp } = event;

      // Find the connected page by Meta page ID
      const page = await prisma.facebookPage.findFirst({
        where: { pageId: recipient.id, isActive: true },
        select: { id: true, workspaceId: true },
      });

      if (!page) {
        console.warn(`[Meta webhook] Received message for unknown page ${recipient.id}`);
        continue;
      }

      // Upsert the contact (Meta user) — update message stats on each message
      const contact = await prisma.contact.upsert({
        where: {
          workspaceId_metaUserId: { workspaceId: page.workspaceId, metaUserId: sender.id },
        },
        update: {
          lastMessageAt: new Date(timestamp),
          totalMessages: { increment: 1 },
        },
        create: {
          workspaceId: page.workspaceId,
          pageId: page.id,
          metaUserId: sender.id,
          lastMessageAt: new Date(timestamp),
          totalMessages: 1,
        },
      });

      // Upsert the conversation — re-open and bump unread count on new message
      const conversation = await prisma.conversation.upsert({
        where: { pageId_contactId: { pageId: page.id, contactId: contact.id } },
        update: {
          lastMessageAt: new Date(timestamp),
          unreadCount: { increment: 1 },
          status: "open",
        },
        create: {
          workspaceId: page.workspaceId,
          pageId: page.id,
          contactId: contact.id,
          lastMessageAt: new Date(timestamp),
          unreadCount: 1,
        },
      });

      // Skip duplicate messages — Meta can re-deliver on retry
      if (message.mid) {
        const duplicate = await prisma.message.findUnique({
          where: { metaMessageId: message.mid },
          select: { id: true },
        });
        if (duplicate) continue;
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          metaMessageId: message.mid ?? null,
          direction: "inbound",
          messageType: message.attachments ? "attachment" : "text",
          content: message.text ?? null,
          attachmentUrl: message.attachments?.[0]?.payload?.url ?? null,
          status: "delivered",
          sentAt: new Date(timestamp),
        },
      });
    }
  }

  return new Response("OK", { status: 200 });
}
