import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, notFound, serverError } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const { id } = await params;
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const { action, planId } = body as Record<string, unknown>;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, status: true, workspace: { select: { id: true, planId: true } } },
    });
    if (!target) return notFound("User not found");

    if (action === "suspend") {
      if (target.id === admin.id) return badRequest("You cannot suspend your own account.");
      await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
      await logAdminAction(admin.id, "SUSPEND_USER", id, "User", { email: target.email });
      return ok({ success: true, status: "SUSPENDED" });
    }

    if (action === "activate") {
      await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
      await logAdminAction(admin.id, "ACTIVATE_USER", id, "User", { email: target.email });
      return ok({ success: true, status: "ACTIVE" });
    }

    if (action === "change-plan") {
      if (!planId || typeof planId !== "string") return badRequest("planId is required for change-plan");
      if (!target.workspace) return badRequest("User has no workspace");
      await prisma.workspace.update({
        where: { id: target.workspace.id },
        data: { planId },
      });
      await logAdminAction(admin.id, "CHANGE_USER_PLAN", id, "User", {
        email: target.email,
        oldPlan: target.workspace.planId,
        newPlan: planId,
      });
      return ok({ success: true, planId });
    }

    return badRequest("action must be one of: suspend, activate, change-plan");
  } catch (e) {
    console.error("[PATCH /api/admin/users/[id]]", e);
    return serverError();
  }
}
