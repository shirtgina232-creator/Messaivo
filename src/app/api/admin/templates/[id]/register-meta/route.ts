import { prisma } from "@/lib/db";
import { requireSuperAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { badRequest, notFound, ok, serverError } from "@/lib/api-helpers";
import { registerUtilityTemplate } from "@/lib/utility-registration";

// Super Admin only: submit a utility template to Meta on behalf of a
// customer's connected Facebook Page.
//
// The customer's Page access token is decrypted server-side inside
// verifyPageGrant() and never leaves the server — the API response and the
// admin UI only ever see registration metadata (status, Meta template name).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireSuperAdminOrError();
  if (err) return err;
  try {
    const { id: templateId } = await params;
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const { workspaceId, pageId } = body as { workspaceId?: unknown; pageId?: unknown };
    if (typeof workspaceId !== "string" || !workspaceId) return badRequest("workspaceId is required");
    if (typeof pageId !== "string" || !pageId) return badRequest("pageId is required");

    // IDOR prevention: the page must belong to the stated workspace.
    const page = await prisma.facebookPage.findFirst({
      where: { id: pageId, workspaceId },
      select: { id: true, workspaceId: true, pageName: true, isActive: true },
    });
    if (!page) return notFound("Facebook Page not found in the specified workspace");
    if (!page.isActive) return badRequest("Facebook Page is not active");

    const template = await prisma.globalTemplate.findFirst({
      where: { id: templateId, isActive: true, status: "active", isUtility: true },
      select: { id: true, name: true },
    });
    if (!template) return notFound("Active utility template not found");

    const r = await registerUtilityTemplate(workspaceId, pageId, templateId);
    await logAdminAction(admin.id, "REGISTER_META_TEMPLATE", r.id, "UtilityTemplateRegistration", {
      templateId,
      templateName: template.name,
      workspaceId,
      pageId,
      pageName: page.pageName,
      status: r.status,
    });
    return ok({
      registration: {
        id: r.id, pageId: r.pageId, status: r.status,
        metaTemplateName: r.metaTemplateName, metaTemplateId: r.metaTemplateId,
        lastCheckedAt: r.lastCheckedAt, lastError: r.lastError,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/templates/[id]/register-meta]", error instanceof Error ? error.message : error);
    return serverError();
  }
}
