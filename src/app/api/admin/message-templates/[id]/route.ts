import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, serverError, notFound, badRequest } from "@/lib/api-helpers";

// Admin: approve or reject a workspace MessageTemplate.
// This is an INTERNAL review action — it does not represent Meta platform approval.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const { id } = await params;
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const data = body as Record<string, unknown>;

    const action = data.action as string;
    if (action !== "approve" && action !== "reject") {
      return badRequest('action must be "approve" or "reject"');
    }

    const existing = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) return notFound("Template not found");
    if (existing.status !== "pending_review") {
      return badRequest(`Template is not pending review. Current status: "${existing.status}"`);
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: { status: newStatus },
    });

    await logAdminAction(
      admin.id,
      action === "approve" ? "APPROVE_MESSAGE_TEMPLATE" : "REJECT_MESSAGE_TEMPLATE",
      id,
      "MessageTemplate",
      { name: template.name, workspaceId: template.workspaceId }
    );

    return ok({ template, message: action === "approve" ? "Template approved. It is now available for sending." : "Template rejected. The workspace owner will be notified." });
  } catch (e) {
    console.error("[PATCH /api/admin/message-templates/[id]]", e);
    return serverError();
  }
}
