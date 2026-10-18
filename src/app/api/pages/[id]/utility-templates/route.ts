import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, serverError, ok } from "@/lib/api-helpers";
import { contentHash } from "@/lib/utility-registration";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id: pageId } = await params;
    const page = await prisma.facebookPage.findFirst({
      where: { id: pageId, workspaceId: ws.id },
      select: { id: true },
    });
    if (!page) return notFound("Page not found");

    const [templates, registrations] = await Promise.all([
      prisma.globalTemplate.findMany({
        where: { isActive: true, isUtility: true, status: "active" },
        select: { id: true, name: true, description: true, content: true, fields: true, category: true },
        orderBy: { name: "asc" },
      }),
      prisma.utilityTemplateRegistration.findMany({
        where: { workspaceId: ws.id, pageId },
        select: { id: true, templateId: true, status: true, metaTemplateName: true, metaTemplateId: true, contentHash: true, lastCheckedAt: true, lastError: true },
      }),
    ]);

    const result = templates.map(t => {
      const hash = contentHash(t.content);
      const reg = registrations.find(r => r.templateId === t.id && r.contentHash === hash);
      return {
        ...t,
        registration: reg
          ? { id: reg.id, status: reg.status, metaTemplateName: reg.metaTemplateName, metaTemplateId: reg.metaTemplateId, lastCheckedAt: reg.lastCheckedAt, lastError: reg.lastError }
          : null,
      };
    });

    return ok({ templates: result });
  } catch (e) {
    console.error("[GET /api/pages/[id]/utility-templates]", e);
    return serverError();
  }
}
