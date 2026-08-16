import { prisma } from "@/lib/db";
import { requireSuperAdminOrError, logAdminAction, ADMIN_ROLES } from "@/lib/admin-helpers";
import { ok, badRequest, notFound, serverError } from "@/lib/api-helpers";

export async function GET() {
  const [, err] = await requireSuperAdminOrError();
  if (err) return err;
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: { in: [...ADMIN_ROLES] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, clerkId: true, email: true, name: true, role: true, createdAt: true },
    });
    return ok({ users: adminUsers });
  } catch (e) {
    console.error("[GET /api/admin/roles]", e);
    return serverError();
  }
}

export async function PATCH(req: Request) {
  const [admin, err] = await requireSuperAdminOrError();
  if (err) return err;
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const { userId, role } = body as Record<string, unknown>;
    if (!userId || typeof userId !== "string") return badRequest("userId is required");
    if (!role || typeof role !== "string") return badRequest("role is required");

    const validRoles = [...ADMIN_ROLES, "USER"];
    if (!validRoles.includes(role)) return badRequest(`role must be one of: ${validRoles.join(", ")}`);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!target) return notFound("User not found");

    // Prevent self-demotion from SUPER_ADMIN if last one
    if (target.id === admin.id && target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      if (superAdminCount <= 1) {
        return badRequest("Cannot remove the last SUPER_ADMIN. Promote another user first.");
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    await logAdminAction(admin.id, "CHANGE_ADMIN_ROLE", userId, "User", {
      email: target.email,
      oldRole: target.role,
      newRole: role,
    });

    return ok({ user: updated });
  } catch (e) {
    console.error("[PATCH /api/admin/roles]", e);
    return serverError();
  }
}
