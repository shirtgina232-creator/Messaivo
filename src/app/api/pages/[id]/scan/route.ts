import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, serverError, ok } from "@/lib/api-helpers";
import { decryptToken } from "@/lib/token-crypto";
import { fetchConversationPage } from "@/lib/meta-graph";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    // Parse optional cursor from request body — absent or null means start from the beginning
    let cursor: string | null = null;
    try {
      const body = await req.json() as { cursor?: string | null };
      cursor = body.cursor ?? null;
    } catch {
      // No body or invalid JSON — start from beginning
    }

    const page = await prisma.facebookPage.findFirst({
      where: { id, workspaceId: ws.id, isActive: true },
      select: { id: true, pageId: true, accessToken: true, workspaceId: true },
    });
    if (!page) return notFound("Page not found or not active");

    let plainToken: string;
    try {
      plainToken = decryptToken(page.accessToken);
    } catch (err) {
      console.error("[scan] token decryption failed:", err instanceof Error ? err.message : String(err));
      await prisma.facebookPage.update({ where: { id }, data: { scanStatus: "error" } });
      return serverError();
    }

    // Mark as scanning on every call
    await prisma.facebookPage.update({ where: { id }, data: { scanStatus: "scanning" } });

    const batchStats = { conversationsProcessed: 0, contactsUpserted: 0, messagesInserted: 0 };
    let scanError: string | null = null;
    let nextCursor: string | null = null;
    let hasMore = false;

    try {
      const result = await fetchConversationPage(plainToken, page.pageId, cursor);

      if (result.error) {
        scanError = result.error;
        console.error(`[scan] page=${page.pageId} Meta API error:`, result.error);
      } else {
        nextCursor = result.nextCursor;
        hasMore = !!nextCursor;

        for (const thread of result.conversations) {
          const customer = thread.participants.data.find(p => p.id !== page.pageId);
          if (!customer) continue;

          const contact = await prisma.contact.upsert({
            where: { workspaceId_metaUserId: { workspaceId: page.workspaceId, metaUserId: customer.id } },
            update: { ...(customer.name ? { name: customer.name } : {}) },
            create: {
              workspaceId: page.workspaceId,
              pageId: page.id,
              metaUserId: customer.id,
              name: customer.name ?? null,
              isSubscribed: true,
            },
          });
          batchStats.contactsUpserted++;

          const msgs = thread.messages?.data ?? [];
          const latestMsgTime = msgs.length > 0
            ? new Date(Math.max(...msgs.map(m => new Date(m.created_time).getTime())))
            : null;

          const conversation = await prisma.conversation.upsert({
            where: { pageId_contactId: { pageId: page.id, contactId: contact.id } },
            update: { ...(latestMsgTime ? { lastMessageAt: latestMsgTime } : {}) },
            create: {
              workspaceId: page.workspaceId,
              pageId: page.id,
              contactId: contact.id,
              lastMessageAt: latestMsgTime,
            },
          });
          batchStats.conversationsProcessed++;

          if (msgs.length > 0) {
            const toInsert = msgs
              .filter(m => m.id)
              .map(m => ({
                conversationId: conversation.id,
                metaMessageId: m.id,
                direction: m.from?.id === page.pageId ? "outbound" : "inbound",
                messageType: "text",
                content: m.message ?? null,
                status: m.from?.id === page.pageId ? "sent" : "delivered",
                sentAt: new Date(m.created_time),
              }));

            if (toInsert.length > 0) {
              const inserted = await prisma.message.createMany({ data: toInsert, skipDuplicates: true });
              batchStats.messagesInserted += inserted.count;
            }
          }
        }
      }
    } finally {
      // Only mark idle + record lastScannedAt when this is the final batch
      await prisma.facebookPage.update({
        where: { id },
        data: {
          scanStatus: scanError ? "error" : (hasMore ? "scanning" : "idle"),
          ...(!scanError && !hasMore ? { lastScannedAt: new Date() } : {}),
        },
      });
    }

    console.log("[scan] batch complete", { pageId: page.pageId, ...batchStats, hasMore, cursor, nextCursor: nextCursor ?? null, scanError });
    return ok({ batchStats, nextCursor, hasMore, error: scanError });

  } catch (e) {
    console.error("[POST /api/pages/[id]/scan]", e);
    try {
      await prisma.facebookPage.update({ where: { id }, data: { scanStatus: "error" } });
    } catch {}
    return serverError();
  }
}
