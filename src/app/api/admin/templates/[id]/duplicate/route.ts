import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { created, notFound, serverError } from "@/lib/api-helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const { id } = await params;
    const source = await prisma.globalTemplate.findUnique({ where: { id } });
    if (!source) return notFound("Template not found");

    const duplicate = await prisma.globalTemplate.create({
      data: {
        name: `Copy of ${source.name}`,
        description: source.description,
        content: source.content,
        fields: source.fields ?? undefined,
        category: source.category,
        status: "draft",
        isActive: false,
        createdBy: admin.id,
      },
    });

    await logAdminAction(admin.id, "DUPLICATE_GLOBAL_TEMPLATE", duplicate.id, "GlobalTemplate", { sourceId: id, name: duplicate.name });
    return created({ template: duplicate });
  } catch (e) {
    console.error("[POST /api/admin/templates/[id]/duplicate]", e);
    return serverError();
  }
}
