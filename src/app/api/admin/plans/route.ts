import { prisma } from "@/lib/db";
import { requireAdminOrError, requireSuperAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, serverError, created } from "@/lib/api-helpers";

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const plans = await prisma.plan.findMany({ orderBy: { displayOrder: "asc" } });
    return ok({ plans });
  } catch (e) {
    console.error("[GET /api/admin/plans]", e);
    return serverError();
  }
}

export async function POST(req: Request) {
  const [admin, err] = await requireSuperAdminOrError();
  if (err) return err;
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const { name, description, monthlyPrice, monthlyCredits, features, isRecommended, displayOrder, premiumInbox, isActive } = body as Record<string, unknown>;
    if (!name || typeof name !== "string") return badRequest("name is required");
    const slug = (name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const plan = await prisma.plan.create({
      data: {
        slug,
        name: name as string,
        description: description as string | undefined,
        monthlyPrice: typeof monthlyPrice === "number" ? monthlyPrice : 0,
        monthlyCredits: typeof monthlyCredits === "number" ? monthlyCredits : 0,
        features: Array.isArray(features) ? features as string[] : [],
        isRecommended: isRecommended === true,
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
        premiumInbox: premiumInbox === true,
        isActive: isActive !== false,
      },
    });
    await logAdminAction(admin.id, "CREATE_PLAN", plan.id, "Plan", { slug: plan.slug, name: plan.name });
    return created({ plan });
  } catch (e) {
    console.error("[POST /api/admin/plans]", e);
    return serverError();
  }
}
