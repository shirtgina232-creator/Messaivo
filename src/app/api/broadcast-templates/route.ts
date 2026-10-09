import { contentHash } from "@/lib/utility-registration";
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
    const pageId = url.searchParams.get("pageId");
    const registrations = pageId ? await prisma.utilityTemplateRegistration.findMany({ where: { workspaceId: ws.id, pageId, page: { workspaceId: ws.id } } }) : [];
    const category = url.searchParams.get("category") ?? undefined;
    const search = url.searchParams.get("search") ?? "";

    const searchFilter = search
      ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { description: { contains: search, mode: "insensitive" as const } }] }
      : {};
    const categoryFilter = category && category !== "all" ? { category } : {};

    const [globalTemplates, workspaceTemplates] = await Promise.all([
      prisma.globalTemplate.findMany({
        where: { isActive: true, ...categoryFilter, ...searchFilter },
        select: { id: true, name: true, description: true, content: true, fields: true, category: true, isUtility: true, metaTemplateName: true, metaTemplateStatus: true, registeredForPageId: true },
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
      ...globalTemplates.map(t => { const r = registrations.find(r => r.templateId === t.id && r.contentHash === contentHash(t.content)); return { ...t, source: "global" as const, isUtility: !!r, metaTemplateName: r?.metaTemplateName ?? null, metaTemplateStatus: r?.status ?? null, registeredForPageId: r?.pageId ?? null }; }),
      ...workspaceTemplates.map(t => ({ ...t, source: "workspace" as const, isUtility: false, metaTemplateName: null, metaTemplateStatus: null, registeredForPageId: null })),
    ];

    return ok({ templates });
  } catch (e) {
    console.error("[GET /api/broadcast-templates]", e);
    return serverError();
  }
}
