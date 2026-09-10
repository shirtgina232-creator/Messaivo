import { prisma } from "@/lib/db";
import { requireAdminOrError } from "@/lib/admin-helpers";
import { ok, serverError } from "@/lib/api-helpers";

// Admin: list workspace MessageTemplates pending review (and any other status for visibility)
export async function GET(req: Request) {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "pending_review";

    const templates = await prisma.messageTemplate.findMany({
      where: { status },
      include: { workspace: { select: { id: true, user: { select: { email: true, name: true } } } } },
      orderBy: { updatedAt: "asc" },
    });

    return ok({ templates });
  } catch (e) {
    console.error("[GET /api/admin/message-templates]", e);
    return serverError();
  }
}
