import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, notFound, serverError } from "@/lib/api-helpers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;

  try {
    const { id } = await params;
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

    const { role } = body as Record<string, unknown>;
    if (role !== "USER" && role !== "ADMIN") return badRequest("role must be 'USER' or 'ADMIN'");

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!target) return notFound("User not found");

    // Prevent self-demotion
    if (target.id === admin.id && role !== "ADMIN") {
      return badRequest("You cannot demote your own admin account.");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as string },
      select: { id: true, email: true, role: true },
    });

    await logAdminAction(admin.id, role === "ADMIN" ? "PROMOTE_USER" : "DEMOTE_USER", id, "user", { email: target.email, newRole: role });

    return ok({ user: updated });
  } catch (e) {
    console.error("[PATCH /api/admin/users/[id]/role]", e);
    return serverError();
  }
}
