import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
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

    const { name, content, category, description, status, tags, fields, pageId } = body as Record<string, unknown>;

    const VALID_STATUSES = new Set(["active", "draft", "inactive"]);
    if (status !== undefined && (typeof status !== "string" || !VALID_STATUSES.has(status))) {
      return badRequest("status must be one of: active, draft, inactive");
    }

    // Validate pageId if provided
    if (pageId !== undefined && pageId !== null) {
      const page = await prisma.facebookPage.findFirst({
        where: { id: pageId as string, workspaceId: ws.id },
        select: { id: true },
      });
      if (!page) return badRequest("Invalid pageId");
    }

    // Build update using unchecked input to allow scalar pageId writes
    const updateData: Prisma.MessageTemplateUncheckedUpdateInput = {};
    if (typeof name === "string" && name.trim()) updateData.name = name.trim();
    if (typeof content === "string" && content.trim()) updateData.content = content.trim();
    if (typeof category === "string") updateData.category = category;
    if (description !== undefined) updateData.description = typeof description === "string" ? description.trim() || null : null;
    if (typeof status === "string") updateData.status = status;
    if (Array.isArray(tags)) updateData.tags = (tags as unknown[]).filter((t): t is string => typeof t === "string");
    if (fields !== undefined) updateData.fields = Array.isArray(fields) ? (fields as Prisma.InputJsonValue) : Prisma.JsonNull;
    if (pageId !== undefined) updateData.pageId = typeof pageId === "string" ? pageId : null;

    const updated = await prisma.messageTemplate.update({
      where: { id },
      data: updateData,
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
