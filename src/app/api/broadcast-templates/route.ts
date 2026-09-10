import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, serverError, ok } from "@/lib/api-helpers";

// Read-only endpoint — returns templates available for composing a broadcast:
//   1. Admin-created GlobalTemplates (isActive = true)
//   2. Workspace's own internally-approved MessageTemplates (status = "approved")
export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const category = url.searchParams.get("category") ?? undefined;
    const search = url.searchParams.get("search") ?? "";

    const searchFilter = search
      ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { description: { contains: search, mode: "insensitive" as const } }] }
      : {};
    const categoryFilter = category && category !== "all" ? { category } : {};

    const [globalTemplates, workspaceTemplates] = await Promise.all([
      prisma.globalTemplate.findMany({
        where: { isActive: true, ...categoryFilter, ...searchFilter },
        select: { id: true, name: true, description: true, content: true, fields: true, category: true },
        orderBy: { name: "asc" },
      }),
      prisma.messageTemplate.findMany({
        where: { workspaceId: ws.id, status: "approved", ...categoryFilter, ...searchFilter },
        select: { id: true, name: true, description: true, content: true, fields: true, category: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Tag source so the compose UI can distinguish them if needed
    const templates = [
      ...globalTemplates.map(t => ({ ...t, source: "global" as const })),
      ...workspaceTemplates.map(t => ({ ...t, source: "workspace" as const })),
    ];

    return ok({ templates });
  } catch (e) {
    console.error("[GET /api/broadcast-templates]", e);
    return serverError();
  }
}
