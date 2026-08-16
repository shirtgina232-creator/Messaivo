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
    const template = await prisma.messageTemplate.findFirst({
      where: { id, workspaceId: ws.id },
    });

    if (!template) return notFound("Template not found");
    return ok({ template });
  } catch (e) {
    console.error("[GET /api/templates/[id]]", e);
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
    const existing = await prisma.messageTemplate.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true },
    });
    if (!existing) return notFound("Template not found");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { name, content, category, tags } = body as Record<string, unknown>;
    const updated = await prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(typeof name === "string" && name.trim() && { name: name.trim() }),
        ...(typeof content === "string" && content.trim() && { content: content.trim() }),
        ...(typeof category === "string" && { category }),
        ...(Array.isArray(tags) && {
          tags: (tags as unknown[]).filter((t): t is string => typeof t === "string"),
        }),
      },
    });

    return ok({ template: updated });
  } catch (e) {
    console.error("[PATCH /api/templates/[id]]", e);
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
    const existing = await prisma.messageTemplate.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true },
    });
    if (!existing) return notFound("Template not found");

    await prisma.messageTemplate.delete({ where: { id } });
    return noContent();
  } catch (e) {
    console.error("[DELETE /api/templates/[id]]", e);
    return serverError();
  }
}
