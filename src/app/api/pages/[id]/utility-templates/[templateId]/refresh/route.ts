import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, serverError, ok } from "@/lib/api-helpers";
import { verifyPageGrant, refreshRegistration } from "@/lib/utility-registration";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id: pageId, templateId } = await params;
    const page = await prisma.facebookPage.findFirst({
      where: { id: pageId, workspaceId: ws.id },
    });
    if (!page) return notFound("Page not found");

    const registration = await prisma.utilityTemplateRegistration.findFirst({
      where: { pageId, templateId, workspaceId: ws.id },
    });
    if (!registration) return badRequest("No registration found — enable this template first");

    const token = await verifyPageGrant(page);
    const r = await refreshRegistration(registration, token, page.pageId);
    return ok({
      registration: {
        id: r.id,
        status: r.status,
        metaTemplateName: r.metaTemplateName,
        metaTemplateId: r.metaTemplateId,
        lastCheckedAt: r.lastCheckedAt,
        lastError: r.lastError,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refresh failed";
    console.error("[POST /api/pages/[id]/utility-templates/[templateId]/refresh]", msg);
    return badRequest(msg);
  }
}
