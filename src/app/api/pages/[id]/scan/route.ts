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

    const batchStats = {
      conversationsProcessed: 0,
      contactsUpserted: 0,
      messagesInserted: 0,
      // Diagnostic counters — help identify where contacts are lost
      apiThreadsReceived: 0,    // raw thread count from Meta API
      skippedNoCustomer: 0,     // threads where participant matching found no customer
    };
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
        batchStats.apiThreadsReceived = result.conversations.length;

        // ── Collect all work upfront, then write to DB in batched transactions ──────
        // This avoids 400 serial DB round-trips (4 per thread × 100 threads) which
        // can breach Vercel's 10-second serverless timeout on large batches.

        type ContactRow = {
          workspaceId: string;
          pageId: string;
          metaUserId: string;
          name: string | null;
          isSubscribed: boolean;
          lastMessageAt: Date | null;
        };

        type ConversationRow = {
          workspaceId: string;
          pageId: string;
          metaUserId: string;  // used to look up the contact ID after upsert
          lastMessageAt: Date | null;
        };

        type MessageRow = {
          metaUserId: string;  // to correlate with contact
          metaMessageId: string;
          direction: "inbound" | "outbound";
          messageType: string;
          content: string | null;
          status: string;
          sentAt: Date;
        };

        const contactRows: ContactRow[] = [];
        const convRows: ConversationRow[] = [];
        const messagesByMetaUser: Map<string, MessageRow[]> = new Map();

        for (const thread of result.conversations) {
          // Identify the customer participant (not the page itself)
          const customer = thread.participants.data.find(p => p.id !== page.pageId);

          if (!customer) {
            batchStats.skippedNoCustomer++;
            // Log the first few skipped threads for diagnosis
            if (batchStats.skippedNoCustomer <= 3) {
              console.warn(
                `[scan] page=${page.pageId} thread=${thread.id} skipped — ` +
                `no non-page participant. Participants: ` +
                JSON.stringify(thread.participants.data.map(p => p.id)),
              );
            }
            continue;
          }

          const threadMsgs = thread.messages?.data ?? [];

          // Latest inbound message determines the 24-hour window eligibility
          const latestInboundAt = threadMsgs
            .filter(m => m.from?.id !== page.pageId)
            .reduce<Date | null>((max, m) => {
              const t = new Date(m.created_time);
              return max === null || t > max ? t : max;
            }, null);

          const latestMsgTime = threadMsgs.length > 0
            ? new Date(Math.max(...threadMsgs.map(m => new Date(m.created_time).getTime())))
            : null;

          contactRows.push({
            workspaceId: page.workspaceId,
            pageId: page.id,
            metaUserId: customer.id,
            name: customer.name ?? null,
            isSubscribed: true,
            lastMessageAt: latestInboundAt,
          });

          convRows.push({
            workspaceId: page.workspaceId,
            pageId: page.id,
            metaUserId: customer.id,
            lastMessageAt: latestMsgTime,
          });

          if (threadMsgs.length > 0) {
            messagesByMetaUser.set(
              customer.id,
              threadMsgs
                .filter(m => m.id)
                .map(m => ({
                  metaUserId: customer.id,
                  metaMessageId: m.id,
                  direction: m.from?.id === page.pageId ? "outbound" : "inbound",
                  messageType: "text",
                  content: m.message ?? null,
                  status: m.from?.id === page.pageId ? "sent" : "delivered",
                  sentAt: new Date(m.created_time),
                })),
            );
          }
        }

        // ── Step 1: Upsert all contacts in parallel ───────────────────────────────
        // IMPORTANT: pageId IS included in the update clause.
        // Without it, contacts created during a previous page connection (different
        // internal UUID) retain the old pageId and are NOT counted in _count.contacts
        // for the current page — causing systematically low contact numbers.
        const contactUpserts = await Promise.all(
          contactRows.map(row =>
            prisma.contact.upsert({
              where: { workspaceId_metaUserId: { workspaceId: row.workspaceId, metaUserId: row.metaUserId } },
              update: {
                // Re-associate with the current page on every scan — this corrects
                // contacts that were scanned under a different internal page ID
                // (e.g., after the page was disconnected and reconnected).
                pageId: row.pageId,
                ...(row.name ? { name: row.name } : {}),
              },
              create: {
                workspaceId: row.workspaceId,
                pageId: row.pageId,
                metaUserId: row.metaUserId,
                name: row.name,
                isSubscribed: true,
              },
              select: { id: true, metaUserId: true, lastMessageAt: true },
            }),
          ),
        );

        batchStats.contactsUpserted = contactUpserts.length;

        // ── Step 2: Backfill lastMessageAt for contacts that need it ──────────────
        // Only update when the scan found a newer inbound timestamp than what's stored.
        const lastMessageAtUpdates = contactRows
          .map((row, i) => ({ contact: contactUpserts[i], latestInboundAt: row.lastMessageAt }))
          .filter(({ contact, latestInboundAt }) =>
            latestInboundAt !== null &&
            (contact.lastMessageAt === null || contact.lastMessageAt < latestInboundAt),
          );

        if (lastMessageAtUpdates.length > 0) {
          await Promise.all(
            lastMessageAtUpdates.map(({ contact, latestInboundAt }) =>
              prisma.contact.update({
                where: { id: contact.id },
                data: { lastMessageAt: latestInboundAt! },
              }),
            ),
          );
        }

        // Build a lookup map: metaUserId → contact DB id
        const contactIdByMetaUserId = new Map(
          contactUpserts.map(c => [c.metaUserId, c.id]),
        );

        // ── Step 3: Upsert all conversations in parallel ──────────────────────────
        await Promise.all(
          convRows.map(row => {
            const contactId = contactIdByMetaUserId.get(row.metaUserId);
            if (!contactId) return Promise.resolve();
            return prisma.conversation.upsert({
              where: { pageId_contactId: { pageId: row.pageId, contactId } },
              update: { ...(row.lastMessageAt ? { lastMessageAt: row.lastMessageAt } : {}) },
              create: {
                workspaceId: row.workspaceId,
                pageId: row.pageId,
                contactId,
                lastMessageAt: row.lastMessageAt,
              },
              select: { id: true, contactId: true },
            });
          }),
        );

        batchStats.conversationsProcessed = convRows.length;

        // ── Step 4: Fetch conversation IDs for message insertion ──────────────────
        if (messagesByMetaUser.size > 0) {
          const contactIds = [...messagesByMetaUser.keys()]
            .map(uid => contactIdByMetaUserId.get(uid))
            .filter((cid): cid is string => cid !== undefined);

          const dbConversations = await prisma.conversation.findMany({
            where: { pageId: page.id, contactId: { in: contactIds } },
            select: { id: true, contactId: true },
          });

          const convIdByContactId = new Map(dbConversations.map(c => [c.contactId, c.id]));

          // Bulk-insert all messages across all conversations
          const allMessages = [...messagesByMetaUser.entries()].flatMap(([metaUserId, msgs]) => {
            const contactId = contactIdByMetaUserId.get(metaUserId);
            const conversationId = contactId ? convIdByContactId.get(contactId) : undefined;
            if (!conversationId) return [];
            return msgs.map(m => ({
              conversationId,
              metaMessageId: m.metaMessageId,
              direction: m.direction,
              messageType: m.messageType,
              content: m.content,
              status: m.status,
              sentAt: m.sentAt,
            }));
          });

          if (allMessages.length > 0) {
            const inserted = await prisma.message.createMany({ data: allMessages, skipDuplicates: true });
            batchStats.messagesInserted = inserted.count;
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

    console.log("[scan] batch complete", {
      pageId: page.pageId,
      cursor: cursor ?? "start",
      nextCursor: nextCursor ?? "done",
      hasMore,
      apiThreadsReceived: batchStats.apiThreadsReceived,
      conversationsProcessed: batchStats.conversationsProcessed,
      skippedNoCustomer: batchStats.skippedNoCustomer,
      contactsUpserted: batchStats.contactsUpserted,
      messagesInserted: batchStats.messagesInserted,
      scanError,
    });

    return ok({ batchStats, nextCursor, hasMore, error: scanError });

  } catch (e) {
    console.error("[POST /api/pages/[id]/scan]", e);
    try {
      await prisma.facebookPage.update({ where: { id }, data: { scanStatus: "error" } });
    } catch {}
    return serverError();
  }
}
