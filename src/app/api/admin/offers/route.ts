import { prisma } from "@/lib/db";
import { requireAdminOrError, requireFinanceOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, serverError, created } from "@/lib/api-helpers";

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const offers = await prisma.offer.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ offers });
  } catch (e) {
    console.error("[GET /api/admin/offers]", e);
    return serverError();
  }
}

export async function POST(req: Request) {
  const [admin, err] = await requireFinanceOrError();
  if (err) return err;
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const data = body as Record<string, unknown>;
    if (!data.name || typeof data.name !== "string") return badRequest("name is required");
    if (data.discountPercent !== undefined && data.discountFixed !== undefined) {
      return badRequest("discountPercent and discountFixed are mutually exclusive");
    }
    const offer = await prisma.offer.create({
      data: {
        name: data.name as string,
        description: typeof data.description === "string" ? data.description : undefined,
        discountPercent: typeof data.discountPercent === "number" ? data.discountPercent : undefined,
        discountFixed: typeof data.discountFixed === "number" ? data.discountFixed : undefined,
        couponCode: typeof data.couponCode === "string" ? data.couponCode : undefined,
        applicablePlanSlugs: Array.isArray(data.applicablePlanSlugs) ? data.applicablePlanSlugs as string[] : [],
        startDate: typeof data.startDate === "string" ? new Date(data.startDate) : undefined,
        endDate: typeof data.endDate === "string" ? new Date(data.endDate) : undefined,
        isActive: data.isActive !== false,
        isAutomatic: data.isAutomatic === true,
      },
    });
    await logAdminAction(admin.id, "CREATE_OFFER", offer.id, "Offer", { name: offer.name });
    return created({ offer });
  } catch (e) {
    console.error("[POST /api/admin/offers]", e);
    return serverError();
  }
}
