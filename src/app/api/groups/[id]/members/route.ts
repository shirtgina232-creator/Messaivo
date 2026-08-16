import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getWorkspace, unauthorized, notFound, badRequest, serverError, ok, noContent,
} from "@/lib/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const group = await prisma.contactGroup.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true },
    });
    if (!group) return notFound("Group not found");

    const members = await prisma.contactGroupMember.findMany({
      where: { groupId: id },
      include: { contact: true },
      orderBy: { addedAt: "desc" },
    });

    return ok({ members });
  } catch (e) {
    console.error("[GET /api/groups/[id]/members]", e);
    return serverError();
  }
}

// POST — add a contact to the group
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id: groupId } = await params;
    const group = await prisma.contactGroup.findFirst({
      where: { id: groupId, workspaceId: ws.id },
      select: { id: true },
    });
    if (!group) return notFound("Group not found");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { contactId } = body as Record<string, unknown>;
    if (!contactId || typeof contactId !== "string") {
      return badRequest("contactId is required");
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, workspaceId: ws.id },
      select: { id: true },
    });
    if (!contact) return notFound("Contact not found");

    try {
      await prisma.contactGroupMember.create({ data: { groupId, contactId } });
    } catch (e) {
      // Already a member — idempotent
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return ok({ message: "Contact is already in this group" });
      }
      throw e;
    }

    return ok({ message: "Contact added to group" });
  } catch (e) {
    console.error("[POST /api/groups/[id]/members]", e);
    return serverError();
  }
}

// DELETE — remove a contact from the group (contactId in request body)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id: groupId } = await params;
    const group = await prisma.contactGroup.findFirst({
      where: { id: groupId, workspaceId: ws.id },
      select: { id: true },
    });
    if (!group) return notFound("Group not found");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { contactId } = body as Record<string, unknown>;
    if (!contactId || typeof contactId !== "string") {
      return badRequest("contactId is required");
    }

    await prisma.contactGroupMember.deleteMany({ where: { groupId, contactId } });
    return noContent();
  } catch (e) {
    console.error("[DELETE /api/groups/[id]/members]", e);
    return serverError();
  }
}
