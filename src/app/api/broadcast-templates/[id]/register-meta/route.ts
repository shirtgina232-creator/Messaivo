import { getWorkspace, unauthorized, badRequest, ok } from "@/lib/api-helpers";
import { registerUtilityTemplate } from "@/lib/utility-registration";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ws = await getWorkspace(); if (!ws) return unauthorized();
  try { const { id } = await params; const { pageId } = await req.json();
    if (typeof pageId !== "string") return badRequest("pageId is required");
    const registration = await registerUtilityTemplate(ws.id, pageId, id);
    return ok({ registration, metaTemplateId: registration.metaTemplateId, metaTemplateName: registration.metaTemplateName, status: registration.status });
  } catch (error) { return badRequest(error instanceof Error ? error.message : "Registration failed"); }
}
