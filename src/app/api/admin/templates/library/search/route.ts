import { NextResponse } from "next/server";
import { requireSuperAdminOrError } from "@/lib/admin-helpers";
import { searchLibraryTemplates } from "@/lib/meta-graph";

/**
 * GET /api/admin/templates/library/search?q=...&language=en_US
 * Super Admin only. Searches Meta's pre-approved utility template library.
 * Uses the Meta app token (server-side only) — no Page token needed.
 */
export async function GET(req: Request) {
  const [, authErr] = await requireSuperAdminOrError();
  if (authErr) return authErr;

  const appId = process.env.META_APP_ID;
  const secret = process.env.META_APP_SECRET;
  if (!appId || !secret) {
    return NextResponse.json({ error: "Meta app credentials are not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const language = searchParams.get("language") ?? "en_US";

  try {
    const templates = await searchLibraryTemplates(`${appId}|${secret}`, q, language);
    return NextResponse.json({
      ok: true,
      count: templates.length,
      templates: templates.map(t => ({
        name: t.name,
        language: t.language,
        category: t.category,
        topic: t.topic ?? null,
        body: t.body,
        paramCount: (t.body.match(/\{\{\d+\}\}/g) ?? []).length,
        bodyParams: t.body_params ?? [],
        buttons: (t.buttons ?? []).map(b => ({ type: b.type, text: b.text })),
      })),
    });
  } catch (error) {
    console.error("[admin/templates/library/search]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Library search failed" },
      { status: 500 }
    );
  }
}
