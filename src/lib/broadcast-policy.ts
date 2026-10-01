import { prisma } from "@/lib/db";
import { approvedRegistration, verifyPageGrant } from "@/lib/utility-registration";
import { recipientEligibility, resolveMessage, utilityPayload } from "@/lib/messaging-policy";
import type { Broadcast, Contact } from "@prisma/client";

export async function selectRecipients(workspaceId: string, pageId: string, input: Record<string, unknown>) {
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  const groups = strings(input.groupIds);
  const ids = strings(input.contactIds);
  return prisma.contact.findMany({ where: {
    workspaceId, pageId,
    ...(input.allPageContacts === true ? {} : groups.length ? { groupMemberships: { some: { groupId: { in: groups }, group: { workspaceId } } } } : { id: { in: ids } }),
  } });
}

export async function prepareBroadcast(broadcast: Broadcast) {
  if (!broadcast.pageId) throw new Error("Broadcast has no Page");
  const owner = await prisma.workspace.findFirst({ where: { id: broadcast.workspaceId, user: { status: "ACTIVE" } } });
  if (!owner) throw new Error("Workspace is suspended or unavailable");
  if (broadcast.messagingType === "UTILITY") {
    if (!broadcast.templateId || !broadcast.utilityRegistrationId) throw new Error("Legacy Utility draft must be recreated with a Page-specific registration");
    const prepared = await approvedRegistration(broadcast.workspaceId, broadcast.pageId, broadcast.templateId, broadcast.utilityRegistrationId);
    if (prepared.registration.content !== broadcast.message) throw new Error("Broadcast content differs from approved template");
    return prepared;
  }
  const page = await prisma.facebookPage.findFirst({ where: { id: broadcast.pageId, workspaceId: broadcast.workspaceId, isActive: true } });
  if (!page) throw new Error("Page is inactive or unavailable");
  return { page, token: await verifyPageGrant(page, false), registration: null };
}

export function prepareRecipient(broadcast: Broadcast, contact: Contact, prepared: Awaited<ReturnType<typeof prepareBroadcast>>) {
  const reason = recipientEligibility(contact, broadcast.workspaceId, prepared.page.id, broadcast.messagingType === "UTILITY");
  if (reason) throw new Error(reason);
  const resolved = resolveMessage(broadcast.message, broadcast.fieldValues, contact, prepared.page.pageName);
  return { text: resolved.text, payload: prepared.registration ? utilityPayload(contact.metaUserId, prepared.registration.metaTemplateName, resolved.parameters, prepared.registration.language) : {
    recipient: { id: contact.metaUserId }, messaging_type: "RESPONSE", message: { text: resolved.text },
  } };
}
