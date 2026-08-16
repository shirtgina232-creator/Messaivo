import { prisma } from "@/lib/db";
import { requireSuperAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, notFound, serverError, badRequest } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireSuperAdminOrError();
  if (err) return err;
  try {
    const { id } = await params;
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) return notFound("Plan not found");
    const data = body as Record<string, unknown>;
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name: typeof data.name === "string" ? data.name : undefined,
        description: typeof data.description === "string" ? data.description : undefined,
        monthlyPrice: typeof data.monthlyPrice === "number" ? data.monthlyPrice : undefined,
        quarterlyPrice: typeof data.quarterlyPrice === "number" ? data.quarterlyPrice : undefined,
        halfYearlyPrice: typeof data.halfYearlyPrice === "number" ? data.halfYearlyPrice : undefined,
        yearlyPrice: typeof data.yearlyPrice === "number" ? data.yearlyPrice : undefined,
        monthlyCredits: typeof data.monthlyCredits === "number" ? data.monthlyCredits : undefined,
        features: Array.isArray(data.features) ? data.features as string[] : undefined,
        isRecommended: typeof data.isRecommended === "boolean" ? data.isRecommended : undefined,
        displayOrder: typeof data.displayOrder === "number" ? data.displayOrder : undefined,
        isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
        premiumInbox: typeof data.premiumInbox === "boolean" ? data.premiumInbox : undefined,
        stripeProductId: typeof data.stripeProductId === "string" ? data.stripeProductId : undefined,
      },
    });
    await logAdminAction(admin.id, "UPDATE_PLAN", id, "Plan", { slug: plan.slug });
    return ok({ plan });
  } catch (e) {
    console.error("[PATCH /api/admin/plans/[id]]", e);
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireSuperAdminOrError();
  if (err) return err;
  try {
    const { id } = await params;
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) return notFound("Plan not found");
    await prisma.plan.delete({ where: { id } });
    await logAdminAction(admin.id, "DELETE_PLAN", id, "Plan", { slug: existing.slug });
    return ok({ success: true });
  } catch (e) {
    console.error("[DELETE /api/admin/plans/[id]]", e);
    return serverError();
  }
}
