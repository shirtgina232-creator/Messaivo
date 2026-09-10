import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, forbidden, notFound, serverError, created } from "@/lib/api-helpers";
import { requireAdminWithRoles } from "@/lib/admin-helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [, adminErr] = await requireAdminWithRoles(["SUPER_ADMIN", "ADMIN"]);
    if (adminErr) return forbidden();
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const source = await prisma.messageTemplate.findFirst({
      where: { id, workspaceId: ws.id },
    });
    if (!source) return notFound("Template not found");

    const duplicate = await prisma.messageTemplate.create({
      data: {
        workspaceId: ws.id,
        name: `Copy of ${source.name}`,
        description: source.description,
        content: source.content,
        category: source.category,
        status: "draft",
        tags: source.tags,
        fields: source.fields ?? undefined,
        pageId: source.pageId,
        usageCount: 0,
      },
    });

    return created({ template: duplicate });
  } catch (e) {
    console.error("[POST /api/templates/[id]/duplicate]", e);
    return serverError();
  }
}
