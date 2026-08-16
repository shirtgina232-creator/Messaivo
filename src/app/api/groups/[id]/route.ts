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
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!group) return notFound("Group not found");
    return ok({ group });
  } catch (e) {
    console.error("[GET /api/groups/[id]]", e);
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
    const existing = await prisma.contactGroup.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true },
    });
    if (!existing) return notFound("Group not found");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { name, description, color } = body as Record<string, unknown>;
    const updated = await prisma.contactGroup.update({
      where: { id },
      data: {
        ...(typeof name === "string" && name.trim() && { name: name.trim() }),
        ...(typeof description === "string" && { description }),
        ...(typeof color === "string" && { color }),
      },
    });

    return ok({ group: updated });
  } catch (e) {
    console.error("[PATCH /api/groups/[id]]", e);
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
    const existing = await prisma.contactGroup.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true },
    });
    if (!existing) return notFound("Group not found");

    await prisma.contactGroup.delete({ where: { id } });
    return noContent();
  } catch (e) {
    console.error("[DELETE /api/groups/[id]]", e);
    return serverError();
  }
}
