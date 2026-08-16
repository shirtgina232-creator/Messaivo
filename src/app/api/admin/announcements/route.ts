import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, serverError, created } from "@/lib/api-helpers";

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ announcements });
  } catch (e) {
    console.error("[GET /api/admin/announcements]", e);
    return serverError();
  }
}

export async function POST(req: Request) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const data = body as Record<string, unknown>;
    if (!data.title || typeof data.title !== "string") return badRequest("title is required");
    if (!data.message || typeof data.message !== "string") return badRequest("message is required");
    const announcement = await prisma.announcement.create({
      data: {
        title: data.title as string,
        message: data.message as string,
        type: typeof data.type === "string" ? data.type : "info",
        ctaText: typeof data.ctaText === "string" ? data.ctaText : undefined,
        ctaUrl: typeof data.ctaUrl === "string" ? data.ctaUrl : undefined,
        startDate: typeof data.startDate === "string" ? new Date(data.startDate) : undefined,
        endDate: typeof data.endDate === "string" ? new Date(data.endDate) : undefined,
        isActive: data.isActive !== false,
        isDismissible: data.isDismissible !== false,
      },
    });
    await logAdminAction(admin.id, "CREATE_ANNOUNCEMENT", announcement.id, "Announcement", { title: announcement.title });
    return created({ announcement });
  } catch (e) {
    console.error("[POST /api/admin/announcements]", e);
    return serverError();
  }
}
