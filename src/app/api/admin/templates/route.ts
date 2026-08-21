import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, serverError, created } from "@/lib/api-helpers";

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
    if (!data.name || typeof data.name !== "string") return badRequest("name is required");
    if (!data.content || typeof data.content !== "string") return badRequest("content is required");
    const template = await prisma.globalTemplate.create({
      data: {
        name: data.name as string,
        description: typeof data.description === "string" ? data.description : null,
        content: data.content as string,
        fields: Array.isArray(data.fields) ? data.fields : undefined,
        category: typeof data.category === "string" ? data.category : undefined,
        isActive: data.isActive !== false,
        createdBy: admin.id,
      },
    });
    await logAdminAction(admin.id, "CREATE_GLOBAL_TEMPLATE", template.id, "GlobalTemplate", { name: template.name });
    return created({ template });
  } catch (e) {
    console.error("[POST /api/admin/templates]", e);
    return serverError();
  }
}
