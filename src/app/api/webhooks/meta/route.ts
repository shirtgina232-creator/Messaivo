import crypto from "crypto";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/token-crypto";
import { sendMessengerMessage } from "@/lib/meta-graph";

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

  const entryCount = payload.entry?.length ?? 0;
  const eventCount = payload.entry?.reduce((n, e) => n + (e.messaging?.length ?? 0), 0) ?? 0;
  console.log(`[Meta webhook] Received ${entryCount} entries, ${eventCount} messaging events`);

  // Respond to Meta immediately — process events in the same request but don't let
  // any single event failure block the 200 response Meta needs within 20 seconds.
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      try {
        await handleMessagingEvent(event);
      } catch (err) {
        console.error("[Meta webhook] Unhandled error processing event:", err, "event:", JSON.stringify(event));
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
    console.log("[Meta webhook] message event", {
      senderId: sender.id,
      recipientId: recipient.id,
      mid: message.mid,
      isEcho: message.is_echo ?? false,
      hasText: !!message.text,
      hasAttachment: !!message.attachments,
    });

    // Skip echo events (messages sent by the Page via API, echoed back to webhook)
    if (message.is_echo) {
      console.log("[Meta webhook] skipping echo event");
      return;
    }

    const page = await prisma.facebookPage.findFirst({
      where: { pageId: recipient.id, isActive: true },
      select: { id: true, workspaceId: true },
    });
    if (!page) {
      console.warn(`[Meta webhook] No active page found in DB for pageId=${recipient.id} — check isActive flag and that this page is connected`);
      return;
    }
    console.log(`[Meta webhook] page matched: dbId=${page.id}`);

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
    console.log(`[Meta webhook] contact upserted: contactId=${contact.id}`);

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
      select: { id: true, aiAutoReply: true, humanTakeover: true },
    });
    console.log(`[Meta webhook] conversation upserted: conversationId=${conversation.id}`);

    // Deduplicate — Meta can re-deliver on retry
    if (message.mid) {
      const dup = await prisma.message.findUnique({
        where: { metaMessageId: message.mid },
        select: { id: true },
      });
      if (dup) {
        console.log(`[Meta webhook] duplicate message mid=${message.mid}, skipping insert`);
        return;
      }
    }

    const msgText = message.text ?? null;

    // Check for opt-out keyword (case-insensitive STOP)
    if (msgText && /^\s*stop\s*$/i.test(msgText)) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { isSubscribed: false },
      });
    }

    const saved = await prisma.message.create({
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
    console.log(`[Meta webhook] message saved: messageId=${saved.id}`);

    // ── AI Auto Reply ─────────────────────────────────────────────────────────
    // Trigger only when aiAutoReply=true, humanTakeover=false, and there is text to respond to
    if (conversation.aiAutoReply && !conversation.humanTakeover && msgText) {
      try {
        await triggerAiAutoReply({
          conversationId: conversation.id,
          pageDbId: page.id,
          contactName: contact.name ?? contact.firstName ?? "there",
          inboundText: msgText,
          metaUserId: sender.id,
        });
      } catch (err) {
        console.error("[Meta webhook] AI auto-reply error:", err);
      }
    }
    return;
  }

  // ── Delivery receipt ──────────────────────────────────────────────────────────
  if (delivery) {
    console.log("[Meta webhook] delivery event", { senderId: sender.id, recipientId: recipient.id, watermark: delivery.watermark });
    const pageAndConv = await resolvePageConversation(recipient.id, sender.id);
    if (!pageAndConv) return;

    const deliveredAt = new Date();
    const watermarkDate = new Date(delivery.watermark);

    // Mark conversation messages delivered
    await prisma.message.updateMany({
      where: {
        conversationId: pageAndConv.conversationId,
        direction:      "outbound",
        status:         "sent",
        sentAt:         { lte: watermarkDate },
      },
      data: { status: "delivered", deliveredAt },
    });

    // Aggregate to broadcast recipients — find metaMessageIds that were just delivered
    try {
      const deliveredMessages = await prisma.message.findMany({
        where: {
          conversationId: pageAndConv.conversationId,
          direction:      "outbound",
          metaMessageId:  { not: null },
          sentAt:         { lte: watermarkDate },
          deliveredAt:    { not: null },
        },
        select: { metaMessageId: true },
      });
      const mids = deliveredMessages.map(m => m.metaMessageId).filter(Boolean) as string[];
      if (mids.length > 0) {
        const updated = await prisma.broadcastRecipient.updateMany({
          where: { metaMessageId: { in: mids }, status: "sent" },
          data: { status: "delivered", deliveredAt },
        });
        if (updated.count > 0) {
          const affected = await prisma.broadcastRecipient.findMany({
            where: { metaMessageId: { in: mids } },
            select: { broadcastId: true },
            distinct: ["broadcastId"],
          });
          for (const { broadcastId } of affected) {
            const count = await prisma.broadcastRecipient.count({
              where: { broadcastId, metaMessageId: { in: mids }, status: "delivered" },
            });
            if (count > 0) {
              await prisma.broadcast.update({
                where: { id: broadcastId },
                data: { delivered: { increment: count } },
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("[Meta webhook] delivery broadcast aggregation error:", err);
    }
    return;
  }

  // ── Read receipt ──────────────────────────────────────────────────────────────
  if (read) {
    console.log("[Meta webhook] read event", { senderId: sender.id, recipientId: recipient.id, watermark: read.watermark });
    const pageAndConv = await resolvePageConversation(recipient.id, sender.id);
    if (!pageAndConv) return;

    const readAt = new Date();
    const watermarkDate = new Date(read.watermark);

    await prisma.message.updateMany({
      where: {
        conversationId: pageAndConv.conversationId,
        direction:      "outbound",
        status:         { in: ["sent", "delivered"] },
        sentAt:         { lte: watermarkDate },
      },
      data: { status: "read", readAt },
    });

    // Clear unread count on conversation when the user reads our messages
    await prisma.conversation.update({
      where: { id: pageAndConv.conversationId },
      data: { unreadCount: 0 },
    });

    // Aggregate to broadcast recipients
    try {
      const readMessages = await prisma.message.findMany({
        where: {
          conversationId: pageAndConv.conversationId,
          direction:      "outbound",
          metaMessageId:  { not: null },
          sentAt:         { lte: watermarkDate },
          readAt:         { not: null },
        },
        select: { metaMessageId: true },
      });
      const mids = readMessages.map(m => m.metaMessageId).filter(Boolean) as string[];
      if (mids.length > 0) {
        const updated = await prisma.broadcastRecipient.updateMany({
          where: { metaMessageId: { in: mids }, status: { in: ["sent", "delivered"] } },
          data: { status: "read", readAt },
        });
        if (updated.count > 0) {
          const affected = await prisma.broadcastRecipient.findMany({
            where: { metaMessageId: { in: mids } },
            select: { broadcastId: true },
            distinct: ["broadcastId"],
          });
          for (const { broadcastId } of affected) {
            const count = await prisma.broadcastRecipient.count({
              where: { broadcastId, metaMessageId: { in: mids }, status: "read" },
            });
            if (count > 0) {
              await prisma.broadcast.update({
                where: { id: broadcastId },
                data: { read: { increment: count } },
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("[Meta webhook] read broadcast aggregation error:", err);
    }
    return;
  }
}

// ── AI Auto Reply ─────────────────────────────────────────────────────────────

async function triggerAiAutoReply({
  conversationId,
  pageDbId,
  contactName,
  inboundText,
  metaUserId,
}: {
  conversationId: string;
  pageDbId: string;
  contactName: string;
  inboundText: string;
  metaUserId: string;
}): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[AI auto-reply] ANTHROPIC_API_KEY not set — skipping");
    return;
  }

  // Fetch the last 10 messages for context
  const recentMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { direction: true, content: true },
  });
  const history = recentMessages.reverse().map(m => ({
    role: m.direction === "inbound" ? "user" : "assistant" as const,
    content: m.content ?? "",
  })).filter(m => m.content);

  // Call Claude API directly
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `You are a helpful customer support agent. Be friendly, concise, and professional. The customer's name is ${contactName}. Keep replies under 3 sentences.`,
      messages: history.length > 0 ? history : [{ role: "user", content: inboundText }],
    }),
  });

  if (!claudeRes.ok) {
    console.error("[AI auto-reply] Claude API error:", await claudeRes.text());
    return;
  }

  const claudeData = await claudeRes.json() as { content: Array<{ type: string; text: string }> };
  const aiReply = claudeData.content?.find(b => b.type === "text")?.text;
  if (!aiReply) return;

  // Look up page access token to send the reply
  const pageRecord = await prisma.facebookPage.findFirst({
    where: { id: pageDbId, isActive: true },
    select: { pageId: true, accessToken: true },
  });
  if (!pageRecord) return;

  let plainToken: string;
  try { plainToken = decryptToken(pageRecord.accessToken); } catch { return; }

  const sendResult = await sendMessengerMessage(plainToken, pageRecord.pageId, metaUserId, aiReply);
  if (sendResult.error) {
    console.error("[AI auto-reply] send failed:", sendResult.error);
    return;
  }

  // Save the AI reply as an outbound message
  await prisma.message.create({
    data: {
      conversationId,
      metaMessageId: sendResult.messageId ?? null,
      direction: "outbound",
      messageType: "text",
      content: aiReply,
      status: "sent",
      sentAt: new Date(),
    },
  });

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  console.log(`[AI auto-reply] sent reply to ${metaUserId}: "${aiReply.slice(0, 60)}…"`);
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
