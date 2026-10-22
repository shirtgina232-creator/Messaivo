import { registerUtilityTemplate } from "@/lib/utility-registration";

// CRON_SECRET-protected internal endpoint for server-side template registration.
// Used when a Clerk browser session is unavailable (CI, scripts, admin tooling).
// Auth pattern mirrors /api/cron/broadcast-worker.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") || "";
  if (!secret || header !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  let body: { workspaceId?: unknown; pageId?: unknown; templateId?: unknown };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }
  const { workspaceId, pageId, templateId } = body;
  if (typeof workspaceId !== "string" || typeof pageId !== "string" || typeof templateId !== "string") {
    return new Response(JSON.stringify({ error: "workspaceId, pageId, templateId required" }), { status: 400 });
  }
  try {
    const registration = await registerUtilityTemplate(workspaceId, pageId, templateId);
    return new Response(JSON.stringify({
      id: registration.id,
      status: registration.status,
      metaTemplateName: registration.metaTemplateName,
      metaTemplateId: registration.metaTemplateId,
      lastError: registration.lastError,
    }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Registration failed" }), { status: 400 });
  }
}
