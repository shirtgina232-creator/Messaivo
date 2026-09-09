import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
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
    const [broadcast, recipientStats] = await Promise.all([
      prisma.broadcast.findFirst({
        where: { id, workspaceId: ws.id },
        include: {
          _count: { select: { recipients: true } },
          template: { select: { fields: true, content: true } },
          messageTemplate: { select: { fields: true, content: true } },
        },
      }),
      prisma.broadcastRecipient.groupBy({
        by: ["status"],
        where: { broadcast: { id, workspaceId: ws.id } },
        _count: { status: true },
      }),
    ]);

    if (!broadcast) return notFound("Broadcast not found");

    const statusCounts = recipientStats.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count.status;
      return acc;
    }, {});

    return ok({ broadcast, recipientStats: statusCounts });
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

    const { name, message, status, scheduledAt, fieldValues } = body as Record<string, unknown>;
    if (status !== undefined && !VALID_STATUSES.includes(status as string)) {
      return badRequest(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    // For GlobalTemplate broadcasts: re-render message when fieldValues are corrected.
    // For MessageTemplate broadcasts: message is the raw template — never re-render here.
    let renderedMessage: string | undefined;
    if (fieldValues !== undefined && typeof fieldValues === "object" && fieldValues !== null && !Array.isArray(fieldValues)) {
      const full = await prisma.broadcast.findFirst({
        where: { id, workspaceId: ws.id },
        select: { templateId: true, messageTemplateId: true },
      });
      if (full?.templateId && !full.messageTemplateId) {
        const tpl = await prisma.globalTemplate.findUnique({
          where: { id: full.templateId },
          select: { content: true },
        });
        if (tpl) {
          const vals = fieldValues as Record<string, string>;
          renderedMessage = tpl.content.replace(/\{\{(\w+)\}\}/g, (_, key) => vals[key] ?? "");
        }
      }
      // MessageTemplate: fieldValues stored as-is; raw template in message remains unchanged
    }

    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        ...(typeof name === "string" && name.trim() && { name: name.trim() }),
        ...(renderedMessage !== undefined && { message: renderedMessage }),
        ...(renderedMessage === undefined && typeof message === "string" && message.trim() && { message: message.trim() }),
        ...(typeof status === "string" && { status }),
        ...(typeof scheduledAt === "string" && { scheduledAt: new Date(scheduledAt) }),
        ...(scheduledAt === null && { scheduledAt: null }),
        ...(fieldValues !== undefined && typeof fieldValues === "object" && !Array.isArray(fieldValues) && {
          fieldValues: fieldValues === null ? Prisma.JsonNull : (fieldValues as Prisma.InputJsonValue),
        }),
      },
    });

    return ok({ broadcast: updated });
  } catch (e) {
    console.error("[PATCH /api/broadcasts/[id]]", e);
    return serverError();
  }
}
