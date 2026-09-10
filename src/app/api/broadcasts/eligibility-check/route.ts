import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON body"); }

    const { pageId, contactIds } = body as Record<string, unknown>;
    if (!pageId || typeof pageId !== "string") return badRequest("pageId is required");

    const page = await prisma.facebookPage.findFirst({
      where: { id: pageId, workspaceId: ws.id },
      select: { id: true },
    });
    if (!page) return badRequest("Page not found");

    const windowCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let contacts: Array<{ isSubscribed: boolean; lastMessageAt: Date | null }>;

    if (Array.isArray(contactIds) && contactIds.length > 0) {
      const ids = (contactIds as unknown[]).filter((x): x is string => typeof x === "string");
      contacts = await prisma.contact.findMany({
        where: { id: { in: ids }, workspaceId: ws.id },
        select: { isSubscribed: true, lastMessageAt: true },
      });
    } else {
      contacts = await prisma.contact.findMany({
        where: { pageId, workspaceId: ws.id },
        select: { isSubscribed: true, lastMessageAt: true },
      });
    }

    // Granular breakdown — each contact falls into exactly one bucket.
    //
    // Messaging method in use: messaging_type "RESPONSE"
    //   Requires: the recipient sent a message to the Page within the last 24 hours.
    //   No alternative method exists in this application.
    //   MESSAGE_TAG and ACCOUNT_UPDATE are NOT used — they require separate Meta
    //   approval and are strictly prohibited for promotional content.

    let windowOpen = 0;       // Subscribed + inbound message within 24 h  → can receive
    let windowClosed = 0;     // Subscribed + inbound message but > 24 h ago → CANNOT receive
    let neverMessaged = 0;    // Subscribed + no inbound message on record   → CANNOT receive
    let unsubscribed = 0;     // Opted out (isSubscribed = false)             → CANNOT receive

    for (const c of contacts) {
      if (!c.isSubscribed) {
        unsubscribed++;
      } else if (!c.lastMessageAt) {
        neverMessaged++;
      } else if (c.lastMessageAt < windowCutoff) {
        windowClosed++;
      } else {
        windowOpen++;
      }
    }

    // "Eligible for method" = contacts that CAN be sent to right now using RESPONSE.
    // This is exactly windowOpen — nothing else qualifies under current platform rules.
    const eligibleForMethod = windowOpen;
    const cannotSend = contacts.length - eligibleForMethod;

    // Legacy aliases kept so older callers continue to work without a breaking change.
    return ok({
      total: contacts.length,
      windowOpen,
      windowClosed,
      neverMessaged,
      unsubscribed,
      eligibleForMethod,
      cannotSend,
      // Legacy fields — deprecated, use the named fields above
      eligible: windowOpen,
      ineligible: windowClosed + neverMessaged,
      skipped: unsubscribed,
    });
  } catch (e) {
    console.error("[POST /api/broadcasts/eligibility-check]", e);
    return serverError();
  }
}
