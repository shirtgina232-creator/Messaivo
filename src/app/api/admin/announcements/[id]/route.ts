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
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return notFound("Announcement not found");
    const data = body as Record<string, unknown>;
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title: typeof data.title === "string" ? data.title : undefined,
        message: typeof data.message === "string" ? data.message : undefined,
        type: typeof data.type === "string" ? data.type : undefined,
        ctaText: typeof data.ctaText === "string" ? data.ctaText : undefined,
        ctaUrl: typeof data.ctaUrl === "string" ? data.ctaUrl : undefined,
        startDate: typeof data.startDate === "string" ? new Date(data.startDate) : undefined,
        endDate: typeof data.endDate === "string" ? new Date(data.endDate) : undefined,
        isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
        isDismissible: typeof data.isDismissible === "boolean" ? data.isDismissible : undefined,
      },
    });
    await logAdminAction(admin.id, "UPDATE_ANNOUNCEMENT", id, "Announcement", { title: announcement.title });
    return ok({ announcement });
  } catch (e) {
    console.error("[PATCH /api/admin/announcements/[id]]", e);
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const { id } = await params;
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return notFound("Announcement not found");
    await prisma.announcement.delete({ where: { id } });
    await logAdminAction(admin.id, "DELETE_ANNOUNCEMENT", id, "Announcement", { title: existing.title });
    return ok({ success: true });
  } catch (e) {
    console.error("[DELETE /api/admin/announcements/[id]]", e);
    return serverError();
  }
}
