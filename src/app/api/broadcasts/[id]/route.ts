import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, serverError, ok } from "@/lib/api-helpers";

const VALID_STATUSES = ["draft", "scheduled", "sending", "completed", "cancelled"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const broadcast = await prisma.broadcast.findFirst({
      where: { id, workspaceId: ws.id },
      include: { _count: { select: { recipients: true } } },
    });

    if (!broadcast) return notFound("Broadcast not found");
    return ok({ broadcast });
  } catch (e) {
    console.error("[GET /api/broadcasts/[id]]", e);
    return serverError();
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const existing = await prisma.broadcast.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true, status: true },
    });
    if (!existing) return notFound("Broadcast not found");

    if (existing.status === "sending" || existing.status === "completed") {
      return badRequest(`Cannot edit a broadcast with status "${existing.status}"`);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { name, message, status, scheduledAt } = body as Record<string, unknown>;
    if (status !== undefined && !VALID_STATUSES.includes(status as string)) {
      return badRequest(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        ...(typeof name === "string" && name.trim() && { name: name.trim() }),
        ...(typeof message === "string" && message.trim() && { message: message.trim() }),
        ...(typeof status === "string" && { status }),
        ...(typeof scheduledAt === "string" && { scheduledAt: new Date(scheduledAt) }),
        ...(scheduledAt === null && { scheduledAt: null }),
      },
    });

    return ok({ broadcast: updated });
  } catch (e) {
    console.error("[PATCH /api/broadcasts/[id]]", e);
    return serverError();
  }
}
