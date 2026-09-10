import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, serverError, created } from "@/lib/api-helpers";

const VALID_STATUSES = new Set(["draft", "active", "inactive"]);
const ADMIN_CATEGORIES = ["Utility", "Reminder", "Confirmation", "Notification", "Customer Service"];

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const templates = await prisma.globalTemplate.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ templates });
  } catch (e) {
    console.error("[GET /api/admin/templates]", e);
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
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) return badRequest("name is required");
    if (!data.content || typeof data.content !== "string" || !data.content.trim()) return badRequest("content is required");

    const status = typeof data.status === "string" && VALID_STATUSES.has(data.status) ? data.status : "active";
    const category = typeof data.category === "string" && ADMIN_CATEGORIES.includes(data.category) ? data.category : null;

    const template = await prisma.globalTemplate.create({
      data: {
        name: (data.name as string).trim(),
        description: typeof data.description === "string" ? data.description.trim() || null : null,
        content: (data.content as string).trim(),
        fields: Array.isArray(data.fields) ? data.fields : undefined,
        category,
        status,
        isActive: status === "active",
        createdBy: admin.id,
      },
    });
    await logAdminAction(admin.id, "CREATE_GLOBAL_TEMPLATE", template.id, "GlobalTemplate", { name: template.name, status });
    return created({ template });
  } catch (e) {
    console.error("[POST /api/admin/templates]", e);
    return serverError();
  }
}

// Exported for use in admin UI (category list)
export { ADMIN_CATEGORIES };
