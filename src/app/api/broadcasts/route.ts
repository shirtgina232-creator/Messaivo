import { prisma } from "@/lib/db";
import { getWorkspace, unauthorized, badRequest, serverError, ok, created } from "@/lib/api-helpers";

interface TemplateField {
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "URL" | "DATE" | "CURRENCY" | "TEXTAREA" | "DROPDOWN";
  required: boolean;
  maxLength?: number;
  options?: string[];
}

function renderTemplate(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

export async function GET(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const broadcasts = await prisma.broadcast.findMany({
      where: {
        workspaceId: ws.id,
        ...(status && { status }),
      },
      include: { _count: { select: { recipients: true } } },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = broadcasts.length > limit;
    const items = hasMore ? broadcasts.slice(0, limit) : broadcasts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return ok({ broadcasts: items, nextCursor });
  } catch (e) {
    console.error("[GET /api/broadcasts]", e);
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const ws = await getWorkspace();
    if (!ws) return unauthorized();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { name, message, pageId, templateId, fieldValues, scheduledAt, contactIds } = body as Record<string, unknown>;

    if (!name || typeof name !== "string" || !name.trim()) return badRequest("name is required");

    // Validate page if provided
    if (pageId) {
      const page = await prisma.facebookPage.findFirst({
        where: { id: pageId as string, workspaceId: ws.id },
        select: { id: true },
      });
      if (!page) return badRequest("Invalid pageId");
    }

    let finalMessage: string;
    let resolvedTemplateName: string | null = null;
    let resolvedFieldValues: Record<string, string> | null = null;

    if (templateId && typeof templateId === "string") {
      // Template path: validate template, render message from field values
      const tpl = await prisma.globalTemplate.findUnique({
        where: { id: templateId },
        select: { id: true, name: true, content: true, fields: true, isActive: true },
      });

      if (!tpl) return badRequest("Template not found");
      if (!tpl.isActive) return badRequest("Template is no longer active");

      const fields = ((tpl.fields ?? []) as unknown) as TemplateField[];
      const values = (typeof fieldValues === "object" && fieldValues !== null && !Array.isArray(fieldValues))
        ? fieldValues as Record<string, string>
        : {};

      // Validate all required fields
      for (const field of fields) {
        const val = (values[field.key] ?? "").trim();
        if (field.required && !val) {
          return badRequest(`Field "${field.label}" is required`);
        }
        if (val && field.type === "URL") {
          try { new URL(val); } catch { return badRequest(`Field "${field.label}" must be a valid URL (include https://)`); }
        }
        if (val && (field.type === "NUMBER" || field.type === "CURRENCY") && isNaN(Number(val))) {
          return badRequest(`Field "${field.label}" must be a number`);
        }
        if (val && field.maxLength && val.length > field.maxLength) {
          return badRequest(`Field "${field.label}" exceeds maximum length of ${field.maxLength} characters`);
        }
      }

      finalMessage = renderTemplate(tpl.content, values as Record<string, string>);
      resolvedTemplateName = tpl.name;
      resolvedFieldValues = values as Record<string, string>;

    } else if (message && typeof message === "string" && message.trim()) {
      // Legacy direct-message path (backward compatibility)
      finalMessage = message.trim();
    } else {
      return badRequest("Either templateId or message is required");
    }

    // Validate contactIds belong to this workspace before creating recipients
    const validContactIds: string[] = [];
    if (Array.isArray(contactIds) && contactIds.length > 0) {
      const ids = (contactIds as unknown[]).filter((x): x is string => typeof x === "string");
      if (ids.length > 0) {
        const found = await prisma.contact.findMany({
          where: { id: { in: ids }, workspaceId: ws.id },
          select: { id: true },
        });
        found.forEach(c => validContactIds.push(c.id));
      }
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        workspaceId: ws.id,
        name: name.trim(),
        message: finalMessage,
        pageId: typeof pageId === "string" ? pageId : null,
        templateId: typeof templateId === "string" ? templateId : null,
        templateName: resolvedTemplateName,
        fieldValues: resolvedFieldValues ?? undefined,
        scheduledAt: typeof scheduledAt === "string" ? new Date(scheduledAt) : null,
        status: "draft",
        totalRecipients: validContactIds.length,
        recipients: validContactIds.length > 0 ? {
          createMany: {
            data: validContactIds.map(contactId => ({ contactId, status: "pending" })),
          },
        } : undefined,
      },
    });

    return created({ broadcast });
  } catch (e) {
    console.error("[POST /api/broadcasts]", e);
    return serverError();
  }
}
