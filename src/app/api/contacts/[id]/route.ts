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
    const contact = await prisma.contact.findFirst({
      where: { id, workspaceId: ws.id },
      include: {
        groupMemberships: { include: { group: { select: { id: true, name: true, color: true } } } },
        page: { select: { id: true, pageName: true } },
      },
    });

    if (!contact) return notFound("Contact not found");
    return ok({ contact });
  } catch (e) {
    console.error("[GET /api/contacts/[id]]", e);
    return serverError();
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const existing = await prisma.contact.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true },
    });
    if (!existing) return notFound("Contact not found");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { name, firstName, lastName, notes, tags, isSubscribed } =
      body as Record<string, unknown>;

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(typeof name === "string" && { name }),
        ...(typeof firstName === "string" && { firstName }),
        ...(typeof lastName === "string" && { lastName }),
        ...(typeof notes === "string" && { notes }),
        ...(Array.isArray(tags) && {
          tags: (tags as unknown[]).filter((t): t is string => typeof t === "string"),
        }),
        ...(typeof isSubscribed === "boolean" && { isSubscribed }),
      },
    });

    return ok({ contact: updated });
  } catch (e) {
    console.error("[PATCH /api/contacts/[id]]", e);
    return serverError();
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const existing = await prisma.contact.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true },
    });
    if (!existing) return notFound("Contact not found");

    await prisma.contact.delete({ where: { id } });
    return noContent();
  } catch (e) {
    console.error("[DELETE /api/contacts/[id]]", e);
    return serverError();
  }
}
