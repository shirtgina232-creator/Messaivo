import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { provisionLibraryTemplates } from "@/lib/utility-registration";

/**
 * POST /api/admin/templates/provision-missing
 * Super Admin only. Backfills library template provisioning for all active pages
 * that are missing registrations (e.g. pages connected before library-first
 * auto-provisioning, or pages where provisioning previously failed).
 *
 * Idempotent and safe to re-run. Processes pages in small batches to stay
 * under Meta rate limits. Never touches production data beyond creating
 * missing template registrations.
 */
export async function POST(req: Request) {
  const [admin, authErr] = await requireSuperAdminOrError();
  if (authErr) return authErr;

  let body: { workspaceId?: string; pageId?: string; batchSize?: number } = {};
  try { body = await req.json(); } catch { /* optional filters */ }

  try {
    // Count active library catalog entries once.
    const catalogCount = await prisma.globalTemplate.count({
      where: { isActive: true, status: "active", isUtility: true, libraryTemplateName: { not: null } },
    });
    if (!catalogCount) {
      return NextResponse.json({ ok: true, message: "No library templates in catalog", pages: [] }, { status: 200 });
    }

    // Find candidate pages: active, optionally filtered to one workspace/page.
    const pages = await prisma.facebookPage.findMany({
      where: {
        isActive: true,
        ...(body.workspaceId ? { workspaceId: body.workspaceId } : {}),
        ...(body.pageId ? { id: body.pageId } : {}),
      },
      select: { id: true, workspaceId: true, pageId: true, pageName: true },
      orderBy: { createdAt: "asc" },
    });

    // Filter to pages missing at least one library registration.
    const targets: typeof pages = [];
    for (const p of pages) {
      const have = await prisma.utilityTemplateRegistration.count({
        where: { pageId: p.id, template: { libraryTemplateName: { not: null } } },
      });
      if (have < catalogCount) targets.push(p);
    }

    const batchSize = Math.min(Math.max(body.batchSize ?? 5, 1), 10);
    const results: Array<{
      pageId: string; pageName: string | null; workspaceId: string;
      provisioned: number; skipped: number; failed: Array<{ template: string; error: string }>;
      error?: string;
    }> = [];

    // Process in batches with a short pause between batches (Meta rate limits).
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      const settled = await Promise.all(batch.map(async (p) => {
        try {
          const summary = await provisionLibraryTemplates(p.workspaceId, p.id);
          return { pageId: p.id, pageName: p.pageName, workspaceId: p.workspaceId, ...summary };
        } catch (error) {
          return {
            pageId: p.id, pageName: p.pageName, workspaceId: p.workspaceId,
            provisioned: 0, skipped: 0, failed: [],
            error: error instanceof Error ? error.message : "Provisioning failed",
          };
        }
      }));
      results.push(...settled);
      if (i + batchSize < targets.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    const totals = results.reduce((a, r) => ({
      provisioned: a.provisioned + r.provisioned,
      skipped: a.skipped + r.skipped,
      failed: a.failed + r.failed.length,
      errors: a.errors + (r.error ? 1 : 0),
    }), { provisioned: 0, skipped: 0, failed: 0, errors: 0 });

    await logAdminAction(admin.id, "templates.provision_missing", undefined, "FacebookPage", {
      pagesProcessed: results.length,
      ...totals,
      ...(body.workspaceId ? { workspaceId: body.workspaceId } : {}),
      ...(body.pageId ? { pageId: body.pageId } : {}),
    });

    return NextResponse.json({
      ok: true,
      catalogTemplates: catalogCount,
      pagesChecked: pages.length,
      pagesProcessed: results.length,
      totals,
      results,
    });
  } catch (error) {
    console.error("[admin/templates/provision-missing]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provisioning failed" },
      { status: 500 }
    );
  }
}
