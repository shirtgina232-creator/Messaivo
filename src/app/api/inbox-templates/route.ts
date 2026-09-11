import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, serverError, ok } from "@/lib/api-helpers";

/**
 * GET /api/inbox-templates?pageId=<db-page-id>&search=<string>&category=<string>
 *
 * Returns templates available in the inbox composer — a broader set than
 * /api/broadcast-templates (which requires status="approved"):
 *
 *   1. Admin GlobalTemplates   — isActive = true
 *   2. Workspace MessageTemplates — status "active" OR "approved"
 *      • Templates with pageId = requested page take priority
 *      • Templates with pageId = null are workspace-wide (included for every page)
 *
 * Facebook Messenger does not have a server-side "approved template" registry
 * (unlike WhatsApp Business). Templates here are the workspace's own library.
 */
export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const pageId  = url.searchParams.get("pageId")  ?? undefined;
    const search  = url.searchParams.get("search")  ?? "";
    const category = url.searchParams.get("category") ?? undefined;

    const searchFilter = search
      ? {
          OR: [
            { name:        { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { content:     { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const categoryFilter = category && category !== "all" ? { category } : {};

    const [globalTemplates, workspaceTemplates] = await Promise.all([
      // Platform-wide templates created by admins
      prisma.globalTemplate.findMany({
        where: { isActive: true, status: "active", ...categoryFilter, ...searchFilter },
        select: {
          id: true, name: true, description: true,
          content: true, fields: true, category: true,
        },
        orderBy: { name: "asc" },
      }),

      // Workspace templates: active or approved; scoped to the page or workspace-wide
      prisma.messageTemplate.findMany({
        where: {
          workspaceId: ws.id,
          status: { in: ["active", "approved"] },
          // Include templates for the specific page AND workspace-wide (pageId = null)
          ...(pageId
            ? { OR: [{ pageId }, { pageId: null }] }
            : {}),
          ...categoryFilter,
          ...searchFilter,
        },
        select: {
          id: true, name: true, description: true,
          content: true, fields: true, category: true,
          status: true, pageId: true, tags: true,
        },
        orderBy: [
          // Exact page match first, then workspace-wide
          { pageId: "asc" },
          { name: "asc" },
        ],
      }),
    ]);

    const templates = [
      ...globalTemplates.map(t => ({
        ...t,
        source: "global" as const,
        status: "active",
        pageId: null as string | null,
        tags: [] as string[],
      })),
      ...workspaceTemplates.map(t => ({
        ...t,
        source: "workspace" as const,
      })),
    ];

    return ok({
      templates,
      meta: {
        total: templates.length,
        globalCount: globalTemplates.length,
        workspaceCount: workspaceTemplates.length,
        pageId: pageId ?? null,
        // Messenger has no server-side approved-template registry (unlike WhatsApp).
        // All templates here are the workspace's own internal library.
        messengerTemplateApiNote:
          "Facebook Messenger does not expose a /message_templates Graph API endpoint. " +
          "The templates shown are from your Messaivo template library.",
      },
    });
  } catch (e) {
    console.error("[GET /api/inbox-templates]", e);
    return serverError();
  }
}
