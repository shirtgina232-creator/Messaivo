import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, created, notFound, serverError, badRequest } from "@/lib/api-helpers";

const VALID_STATUSES = new Set(["draft", "active", "inactive"]);
const ADMIN_CATEGORIES = ["Utility", "Reminder", "Confirmation", "Notification", "Customer Service"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const { id } = await params;
    const template = await prisma.globalTemplate.findUnique({ where: { id } });
    if (!template) return notFound("Template not found");
    return ok({ template });
  } catch (e) {
    console.error("[GET /api/admin/templates/[id]]", e);
    return serverError();
  }
}

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

    const updateData: Record<string, unknown> = {};
    if (typeof data.name === "string" && data.name.trim()) updateData.name = data.name.trim();
    if (typeof data.description === "string") updateData.description = data.description.trim() || null;
    if (typeof data.content === "string" && data.content.trim()) updateData.content = data.content.trim();
    if (Array.isArray(data.fields)) updateData.fields = data.fields;
    if (typeof data.category === "string") {
      updateData.category = ADMIN_CATEGORIES.includes(data.category) ? data.category : null;
    }
    if (typeof data.status === "string" && VALID_STATUSES.has(data.status)) {
      updateData.status = data.status;
      updateData.isActive = data.status === "active";
    }

    const template = await prisma.globalTemplate.update({ where: { id }, data: updateData });
    await logAdminAction(admin.id, "UPDATE_GLOBAL_TEMPLATE", id, "GlobalTemplate", { name: template.name, status: template.status });
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
