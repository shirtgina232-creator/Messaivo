import { getWorkspace, unauthorized, badRequest, ok } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { verifyPageGrant, refreshRegistration } from "@/lib/utility-registration";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ws = await getWorkspace();
  if (!ws) return unauthorized();
  try {
    const { id } = await params;
    const { pageId, registrationId } = await req.json() as { pageId?: unknown; registrationId?: unknown };
    if (typeof pageId !== "string") return badRequest("pageId is required");
    const page = await prisma.facebookPage.findFirst({ where: { id: pageId, workspaceId: ws.id } });
    if (!page) return badRequest("Page not found");
    const where = typeof registrationId === "string"
      ? { id: registrationId, templateId: id, workspaceId: ws.id }
      : { templateId: id, pageId, workspaceId: ws.id };
    const registration = await prisma.utilityTemplateRegistration.findFirst({ where });
    if (!registration) return badRequest("No registration found — register this template first");
    const token = await verifyPageGrant(page);
    const r = await refreshRegistration(registration, token, page.pageId);
    return ok({
      registration: {
        id: r.id, pageId: r.pageId, status: r.status,
        metaTemplateName: r.metaTemplateName, metaTemplateId: r.metaTemplateId,
        lastCheckedAt: r.lastCheckedAt, lastError: r.lastError,
      },
    });
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "Refresh failed");
  }
}
