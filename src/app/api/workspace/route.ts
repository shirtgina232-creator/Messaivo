import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok } from "@/lib/api-helpers";

export async function GET() {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const [creditLedger, connectedPagesCount] = await Promise.all([
      prisma.creditLedger.findUnique({ where: { workspaceId: ws.id } }),
      prisma.facebookPage.count({ where: { workspaceId: ws.id, isActive: true } }),
    ]);

    return ok({ workspace: ws, creditLedger, connectedPagesCount });
  } catch (e) {
    console.error("[GET /api/workspace]", e);
    return serverError();
  }
}

export async function PATCH(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { name } = body as Record<string, unknown>;
    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return badRequest("name must be a non-empty string");
    }

    const updated = await prisma.workspace.update({
      where: { id: ws.id },
      data: { ...(typeof name === "string" && { name: name.trim() }) },
    });

    return ok({ workspace: updated });
  } catch (e) {
    console.error("[PATCH /api/workspace]", e);
    return serverError();
  }
}
