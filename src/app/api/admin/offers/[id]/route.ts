import { prisma } from "@/lib/db";
import { requireFinanceOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, notFound, serverError, badRequest } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireFinanceOrError();
  if (err) return err;
  try {
    const { id } = await params;
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing) return notFound("Offer not found");
    const data = body as Record<string, unknown>;
    if (data.discountPercent !== undefined && data.discountFixed !== undefined) {
      return badRequest("discountPercent and discountFixed are mutually exclusive");
    }
    const offer = await prisma.offer.update({
      where: { id },
      data: {
        name: typeof data.name === "string" ? data.name : undefined,
        description: typeof data.description === "string" ? data.description : undefined,
        discountPercent: typeof data.discountPercent === "number" ? data.discountPercent : null,
        discountFixed: typeof data.discountFixed === "number" ? data.discountFixed : null,
        couponCode: typeof data.couponCode === "string" ? data.couponCode : undefined,
        applicablePlanSlugs: Array.isArray(data.applicablePlanSlugs) ? data.applicablePlanSlugs as string[] : undefined,
        startDate: typeof data.startDate === "string" ? new Date(data.startDate) : undefined,
        endDate: typeof data.endDate === "string" ? new Date(data.endDate) : undefined,
        isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
        isAutomatic: typeof data.isAutomatic === "boolean" ? data.isAutomatic : undefined,
      },
    });
    await logAdminAction(admin.id, "UPDATE_OFFER", id, "Offer", { name: offer.name });
    return ok({ offer });
  } catch (e) {
    console.error("[PATCH /api/admin/offers/[id]]", e);
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [admin, err] = await requireFinanceOrError();
  if (err) return err;
  try {
    const { id } = await params;
    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing) return notFound("Offer not found");
    await prisma.offer.delete({ where: { id } });
    await logAdminAction(admin.id, "DELETE_OFFER", id, "Offer", { name: existing.name });
    return ok({ success: true });
  } catch (e) {
    console.error("[DELETE /api/admin/offers/[id]]", e);
    return serverError();
  }
}
