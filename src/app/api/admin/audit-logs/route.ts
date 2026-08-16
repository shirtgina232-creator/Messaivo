import { prisma } from "@/lib/db";
import { requireAdminOrError } from "@/lib/admin-helpers";
import { ok, serverError } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const [, err] = await requireAdminOrError();
  if (err) return err;

  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: { admin: { select: { email: true, name: true } } },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    return ok({ logs: items, nextCursor: hasMore ? items[items.length - 1].id : null });
  } catch (e) {
    console.error("[GET /api/admin/audit-logs]", e);
    return serverError();
  }
}
