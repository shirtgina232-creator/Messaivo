import { prisma } from "@/lib/db";
import { requireAdminOrError } from "@/lib/admin-helpers";
import { ok, serverError } from "@/lib/api-helpers";

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, clerkId: true, email: true, name: true, role: true, status: true, createdAt: true,
        workspace: { select: { id: true, name: true, planId: true } },
      },
    });
    return ok({ users });
  } catch (e) {
    console.error("[GET /api/admin/users]", e);
    return serverError();
  }
}
