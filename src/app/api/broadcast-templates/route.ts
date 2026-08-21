import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, serverError, ok } from "@/lib/api-helpers";

// Read-only endpoint — workspace users can list active admin GlobalTemplates.
// Creating or editing templates requires admin access via /api/admin/templates.
export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const category = url.searchParams.get("category") ?? undefined;
    const search = url.searchParams.get("search") ?? "";

    const templates = await prisma.globalTemplate.findMany({
      where: {
        isActive: true,
        ...(category && category !== "all" && { category }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        content: true,
        fields: true,
        category: true,
      },
      orderBy: { name: "asc" },
    });

    return ok({ templates });
  } catch (e) {
    console.error("[GET /api/broadcast-templates]", e);
    return serverError();
  }
}
