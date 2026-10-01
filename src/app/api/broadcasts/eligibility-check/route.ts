import { getWorkspace, unauthorized, badRequest, ok } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { selectRecipients } from "@/lib/broadcast-policy";
import { recipientEligibility } from "@/lib/messaging-policy";
export async function POST(req: Request) {
  const ws = await getWorkspace(); if (!ws) return unauthorized();
  try {
    const input = await req.json(); const { pageId } = input;
    if (typeof pageId !== "string" || !await prisma.facebookPage.findFirst({ where: { id: pageId, workspaceId: ws.id, isActive: true } })) return badRequest("Active Page required");
    const contacts = await selectRecipients(ws.id, pageId, { ...input, allPageContacts: !input.contactIds?.length && !input.groupIds?.length });
    const utility = ["utility", "UTILITY"].includes(input.messagingType);
    const reasons: Record<string, number> = {}; let eligible = 0; let windowOpen = 0; let windowClosed = 0;
    for (const contact of contacts) {
      const reason = recipientEligibility(contact, ws.id, pageId, utility);
      if (reason) reasons[reason] = (reasons[reason] || 0) + 1; else eligible++;
      if (!recipientEligibility(contact, ws.id, pageId, true)) {
        if (!recipientEligibility(contact, ws.id, pageId, false)) windowOpen++; else windowClosed++;
      }
    }
    return ok({ total: contacts.length, eligible, eligibleForMethod: eligible, cannotSend: contacts.length - eligible, reasons, windowOpen, windowClosed, neverMessaged: reasons.unverified_relationship || 0, unsubscribed: reasons.unsubscribed || 0, atRisk: 0, skipped: reasons.unsubscribed || 0, ineligible: contacts.length - eligible, messagingMethod: utility ? "UTILITY" : "RESPONSE" });
  } catch (error) { return badRequest(error instanceof Error ? error.message : "Invalid selection"); }
}
