import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, serverError, ok, created } from "@/lib/api-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id: broadcastId } = await params;
    const broadcast = await prisma.broadcast.findFirst({
      where: { id: broadcastId, workspaceId: ws.id },
      select: { id: true },
    });
    if (!broadcast) return notFound("Broadcast not found");

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const recipients = await prisma.broadcastRecipient.findMany({
      where: { broadcastId },
      include: {
        contact: { select: { id: true, name: true, firstName: true, lastName: true, profilePicUrl: true } },
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = recipients.length > limit;
    const items = hasMore ? recipients.slice(0, limit) : recipients;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return ok({ recipients: items, nextCursor });
  } catch (e) {
    console.error("[GET /api/broadcasts/[id]/recipients]", e);
    return serverError();
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id: broadcastId } = await params;
    const broadcast = await prisma.broadcast.findFirst({
      where: { id: broadcastId, workspaceId: ws.id },
      select: { id: true, status: true },
    });
    if (!broadcast) return notFound("Broadcast not found");
    if (broadcast.status !== "draft") {
      return badRequest("Can only add recipients to a draft broadcast");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { contactIds, groupId } = body as Record<string, unknown>;
    let ids: string[] = [];

    if (groupId && typeof groupId === "string") {
      const group = await prisma.contactGroup.findFirst({
        where: { id: groupId, workspaceId: ws.id },
        include: { members: { select: { contactId: true } } },
      });
      if (!group) return badRequest("Invalid groupId");
      ids = group.members.map((m) => m.contactId);
    } else if (Array.isArray(contactIds)) {
      ids = (contactIds as unknown[]).filter((id): id is string => typeof id === "string");
    } else {
      return badRequest("Provide contactIds (array) or groupId");
    }

    if (ids.length === 0) return ok({ added: 0, total: 0 });

    // Filter to contacts that actually belong to this workspace
    const validContacts = await prisma.contact.findMany({
      where: { id: { in: ids }, workspaceId: ws.id },
      select: { id: true },
    });
    const validIds = validContacts.map((c) => c.id);

    await prisma.broadcastRecipient.createMany({
      data: validIds.map((contactId) => ({ broadcastId, contactId })),
      skipDuplicates: true,
    });

    const total = await prisma.broadcastRecipient.count({ where: { broadcastId } });
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { totalRecipients: total },
    });

    return created({ added: validIds.length, total });
  } catch (e) {
    console.error("[POST /api/broadcasts/[id]/recipients]", e);
    return serverError();
  }
}
