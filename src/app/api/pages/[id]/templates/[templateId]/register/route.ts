import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, ok, serverError } from "@/lib/api-helpers";
import { registerUtilityTemplate } from "@/lib/utility-registration";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const ws = await getWorkspace();
  if (!ws) return unauthorized();

  const { id: pageId, templateId } = await params;

  const page = await prisma.facebookPage.findFirst({
    where: { id: pageId, workspaceId: ws.id },
    select: { id: true, isActive: true },
  });
  if (!page) return notFound("Facebook Page not found");
  if (!page.isActive) return badRequest("Facebook Page is not active");

  const template = await prisma.globalTemplate.findFirst({
    where: { id: templateId, isActive: true, status: "active", isUtility: true },
    select: { id: true, name: true },
  });
  if (!template) return notFound("Active utility template not found");

  try {
    const registration = await registerUtilityTemplate(ws.id, pageId, templateId);
    return ok({
      registration: {
        id: registration.id,
        status: registration.status,
        metaTemplateName: registration.metaTemplateName,
        metaTemplateId: registration.metaTemplateId,
        lastCheckedAt: registration.lastCheckedAt,
        lastError: registration.lastError,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Registration failed";
    console.error("[POST /api/pages/[id]/templates/[templateId]/register]", msg);
    // User-facing errors from verifyPageGrant / Meta API
    const isUserFacing =
      msg.includes("grant") ||
      msg.includes("reconnect") ||
      msg.includes("expired") ||
      msg.includes("already in progress") ||
      msg.includes("not approved") ||
      msg.includes("inactive") ||
      msg.includes("not found");
    if (isUserFacing) return badRequest(msg);
    return serverError();
  }
}
