import { getWorkspace, unauthorized, badRequest, ok } from "@/lib/api-helpers";
import { registerUtilityTemplate } from "@/lib/utility-registration";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ws = await getWorkspace(); if (!ws) return unauthorized();
  try {
    const { id } = await params;
    const { pageId } = await req.json() as { pageId?: unknown };
    if (typeof pageId !== "string") return badRequest("pageId is required");
    const r = await registerUtilityTemplate(ws.id, pageId, id);
    return ok({
      registration: {
        id: r.id, pageId: r.pageId, status: r.status,
        metaTemplateName: r.metaTemplateName, metaTemplateId: r.metaTemplateId,
        lastCheckedAt: r.lastCheckedAt, lastError: r.lastError,
      },
    });
  } catch (error) { return badRequest(error instanceof Error ? error.message : "Registration failed"); }
}
