import { prisma } from "@/lib/db";
import { requireSuperAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { badRequest, notFound, ok, serverError } from "@/lib/api-helpers";
import { verifyPageGrant, refreshRegistration } from "@/lib/utility-registration";

// Super Admin only: refresh the Meta approval status of a template
// registration belonging to a customer's Page. The Page access token is
// decrypted server-side and never exposed to the client.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireSuperAdminOrError();
  if (err) return err;
  try {
    const { id: templateId } = await params;
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const { workspaceId, pageId, registrationId } = body as {
      workspaceId?: unknown; pageId?: unknown; registrationId?: unknown;
    };
    if (typeof workspaceId !== "string" || !workspaceId) return badRequest("workspaceId is required");
    if (typeof pageId !== "string" || !pageId) return badRequest("pageId is required");

    // IDOR prevention: the page must belong to the stated workspace.
    const page = await prisma.facebookPage.findFirst({ where: { id: pageId, workspaceId } });
    if (!page) return notFound("Facebook Page not found in the specified workspace");

    const where = typeof registrationId === "string" && registrationId
      ? { id: registrationId, templateId, workspaceId }
      : { templateId, pageId, workspaceId };
    const registration = await prisma.utilityTemplateRegistration.findFirst({ where });
    if (!registration) return badRequest("No registration found — register this template first");

    const token = await verifyPageGrant(page);
    const r = await refreshRegistration(registration, token, page.pageId);
    await logAdminAction(admin.id, "REFRESH_META_TEMPLATE", r.id, "UtilityTemplateRegistration", {
      templateId, workspaceId, pageId, status: r.status,
    });
    return ok({
      registration: {
        id: r.id, pageId: r.pageId, status: r.status,
        metaTemplateName: r.metaTemplateName, metaTemplateId: r.metaTemplateId,
        lastCheckedAt: r.lastCheckedAt, lastError: r.lastError,
      },
    });
  } catch (e) {
    console.error("[POST /api/admin/templates/[id]/refresh-registration]", e instanceof Error ? e.message : e);
    return serverError();
  }
}
