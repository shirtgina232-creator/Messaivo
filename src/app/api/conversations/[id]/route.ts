import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, notFound, badRequest, serverError, ok } from "@/lib/api-helpers";

const VALID_STATUSES = ["open", "closed", "snoozed", "spam"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const { id } = await params;
    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId: ws.id },
      include: {
        contact: true,
        page: { select: { id: true, pageName: true, pageAvatar: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 50 },
      },
    });

    if (!conversation) return notFound("Conversation not found");
    return ok({ conversation });
  } catch (e) {
    console.error("[GET /api/conversations/[id]]", e);
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
    const existing = await prisma.conversation.findFirst({
      where: { id, workspaceId: ws.id },
      select: { id: true },
    });
    if (!existing) return notFound("Conversation not found");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { status, assignedTo, unreadCount } = body as Record<string, unknown>;
    if (status !== undefined && !VALID_STATUSES.includes(status as string)) {
      return badRequest(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...(typeof status === "string" && { status }),
        ...(typeof assignedTo === "string" && { assignedTo }),
        ...(typeof unreadCount === "number" && { unreadCount }),
      },
    });

    return ok({ conversation: updated });
  } catch (e) {
    console.error("[PATCH /api/conversations/[id]]", e);
    return serverError();
  }
}
