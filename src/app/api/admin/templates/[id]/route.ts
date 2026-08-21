import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, notFound, serverError, badRequest } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const { id } = await params;
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const existing = await prisma.globalTemplate.findUnique({ where: { id } });
    if (!existing) return notFound("Template not found");
    const data = body as Record<string, unknown>;
    const template = await prisma.globalTemplate.update({
      where: { id },
      data: {
        name: typeof data.name === "string" ? data.name : undefined,
        description: typeof data.description === "string" ? data.description : undefined,
        content: typeof data.content === "string" ? data.content : undefined,
        fields: Array.isArray(data.fields) ? data.fields : undefined,
        category: typeof data.category === "string" ? data.category : undefined,
        isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
      },
    });
    await logAdminAction(admin.id, "UPDATE_GLOBAL_TEMPLATE", id, "GlobalTemplate", { name: template.name });
    return ok({ template });
  } catch (e) {
    console.error("[PATCH /api/admin/templates/[id]]", e);
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const { id } = await params;
    const existing = await prisma.globalTemplate.findUnique({ where: { id } });
    if (!existing) return notFound("Template not found");
    await prisma.globalTemplate.delete({ where: { id } });
    await logAdminAction(admin.id, "DELETE_GLOBAL_TEMPLATE", id, "GlobalTemplate", { name: existing.name });
    return ok({ success: true });
  } catch (e) {
    console.error("[DELETE /api/admin/templates/[id]]", e);
    return serverError();
  }
}
