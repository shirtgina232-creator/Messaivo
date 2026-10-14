import { approvedRegistration } from "@/lib/utility-registration";
import { selectRecipients } from "@/lib/broadcast-policy";
import { parseFieldValues, recipientEligibility, resolveMessage } from "@/lib/messaging-policy";
import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok, created } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const broadcasts = await prisma.broadcast.findMany({
      where: {
        workspaceId: ws.id,
        ...(status && { status }),
      },
      include: { _count: { select: { recipients: true } } },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = broadcasts.length > limit;
    const items = hasMore ? broadcasts.slice(0, limit) : broadcasts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return ok({ broadcasts: items, nextCursor });
  } catch (e) {
    console.error("[GET /api/broadcasts]", e);
    return serverError();
  }
}

export async function POST(req: Request) {
  const ws = await getWorkspace(); if (!ws) return unauthorized();
  try {
    const input = await req.json();
    const { name, pageId, templateId, messageTemplateId, messagingType } = input;
    if (typeof name !== "string" || !name.trim() || typeof pageId !== "string") return badRequest("Name and Page are required");
    const page = await prisma.facebookPage.findFirst({ where: { id: pageId, workspaceId: ws.id, isActive: true } });
    if (!page) return badRequest("Active Page not found");
    const utility = messagingType === "utility" || messagingType === "UTILITY";
    if (utility && (typeof templateId !== "string" || messageTemplateId)) return badRequest("Utility requires a registered catalog template");
    const values = parseFieldValues(input.fieldValues);
    let content = typeof input.message === "string" ? input.message : "";
    let title: string | null = null;
    let registration: Awaited<ReturnType<typeof approvedRegistration>>["registration"] | null = null;
    if (templateId) {
      const tpl = await prisma.globalTemplate.findFirst({ where: { id: templateId, isActive: true, status: "active" } });
      if (!tpl) return badRequest("Active template not found");
      content = tpl.content; title = tpl.name;
      if (utility) registration = (await approvedRegistration(ws.id, pageId, templateId)).registration;
    } else if (messageTemplateId) {
      const tpl = await prisma.messageTemplate.findFirst({ where: { id: messageTemplateId, workspaceId: ws.id, status: "approved", OR: [{ pageId }, { pageId: null }] } });
      if (!tpl) return badRequest("Approved workspace template not found");
      content = tpl.content; title = tpl.name;
    }
    if (!content.trim()) return badRequest("Message content is required");
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (scheduledAt && (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date())) return badRequest("Schedule must be a valid future date");
    const contacts = await selectRecipients(ws.id, pageId, input);
    const eligible = contacts.filter(c => !recipientEligibility(c, ws.id, pageId, utility));
    for (const contact of eligible) resolveMessage(content, values, contact, page.pageName);
    const broadcast = await prisma.broadcast.create({ data: {
      workspaceId: ws.id, name: name.trim(), pageId, templateId: templateId || null, messageTemplateId: messageTemplateId || null,
      message: content, templateName: title, fieldValues: values, scheduledAt, messagingType: utility ? "UTILITY" : null,
      utilityRegistrationId: registration?.id, metaTemplateName: registration?.metaTemplateName,
      totalRecipients: eligible.length, recipients: { createMany: { data: eligible.map(c => ({ contactId: c.id })) } },
    } });
    return created({ broadcast, excluded: contacts.length - eligible.length });
  } catch (error) { return badRequest(error instanceof Error ? error.message : "Invalid broadcast"); }
}
