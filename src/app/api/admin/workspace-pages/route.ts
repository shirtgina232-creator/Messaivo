import { prisma } from "@/lib/db";
import { requireSuperAdminOrError } from "@/lib/admin-helpers";
import { ok, serverError } from "@/lib/api-helpers";

// Super Admin only: list customer workspaces with their connected Facebook
// Pages, for the "Register with Meta" picker in Template Management.
//
// SECURITY: never select FacebookPage.accessToken here — the page access
// token is decrypted server-side only when a Meta API call is made, and is
// never exposed to the admin UI or API responses.
export async function GET(req: Request) {
  const [, err] = await requireSuperAdminOrError();
  if (err) return err;
  try {
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") ?? "").trim();
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1), 50);

    const workspaces = await prisma.workspace.findMany({
      where: search ? { name: { contains: search, mode: "insensitive" } } : {},
      select: {
        id: true,
        name: true,
        pages: {
          where: { isActive: true },
          select: {
            id: true,
            pageName: true,
            isActive: true,
            utilityPermissionGranted: true,
            permissionError: true,
          },
          orderBy: { pageName: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return ok({ workspaces });
  } catch (e) {
    console.error("[GET /api/admin/workspace-pages]", e);
    return serverError();
  }
}
