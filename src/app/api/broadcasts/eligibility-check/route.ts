import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok } from "@/lib/api-helpers";

const VALID_TAGS = new Set(["CONFIRMED_EVENT_UPDATE", "POST_PURCHASE_UPDATE", "ACCOUNT_UPDATE"]);

export async function POST(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON body"); }

    const { pageId, contactIds, messagingTag } = body as Record<string, unknown>;
    if (!pageId || typeof pageId !== "string") return badRequest("pageId is required");

    // messagingTag is optional — when provided, switches eligibility to MESSAGE_TAG rules.
    // Only accepts the three officially supported tag values.
    const useMessageTag = typeof messagingTag === "string" && VALID_TAGS.has(messagingTag);

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

    // Four base buckets — same regardless of messaging method:
    let windowOpen = 0;    // Subscribed + inbound message within 24 h
    let windowClosed = 0;  // Subscribed + inbound message but > 24 h ago
    let neverMessaged = 0; // Subscribed + no inbound message on record (higher error risk)
    let unsubscribed = 0;  // Opted out (isSubscribed = false)

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

    // Eligibility depends on the selected messaging method:
    //
    // RESPONSE (default):
    //   Only windowOpen contacts can receive a message.
    //   The 24-hour window is enforced by Meta — error code #10 / #1545041 on violation.
    //
    // MESSAGE_TAG (when messagingTag is set to a supported value):
    //   windowOpen + windowClosed are eligible — no 24-hour restriction.
    //   neverMessaged contacts are "at risk" — they may have a stale/unanchored PSID
    //   and may produce error #551 ("this person isn't available right now").
    //   unsubscribed contacts remain ineligible.
    //   Content MUST match the tag type — misuse violates Meta policy.

    let eligibleForMethod: number;
    let atRisk: number;      // Subscribed but never sent a message — possible #551 errors
    let cannotSend: number;

    if (useMessageTag) {
      eligibleForMethod = windowOpen + windowClosed;
      atRisk = neverMessaged;
      cannotSend = unsubscribed;
    } else {
      eligibleForMethod = windowOpen;
      atRisk = 0;
      cannotSend = contacts.length - windowOpen;
    }

    return ok({
      total: contacts.length,
      windowOpen,
      windowClosed,
      neverMessaged,
      unsubscribed,
      eligibleForMethod,
      atRisk,
      cannotSend,
      messagingMethod: useMessageTag ? "MESSAGE_TAG" : "RESPONSE",
      messagingTag: useMessageTag ? messagingTag : null,
      // Legacy aliases — kept for backward compatibility
      eligible: windowOpen,
      ineligible: windowClosed + neverMessaged,
      skipped: unsubscribed,
    });
  } catch (e) {
    console.error("[POST /api/broadcasts/eligibility-check]", e);
    return serverError();
  }
}
