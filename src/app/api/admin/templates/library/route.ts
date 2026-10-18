import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { templateKeys } from "@/lib/messaging-policy";

/**
 * POST /api/admin/templates/library
 * Super Admin only. Adds a Meta pre-approved library template to the catalog.
 * Body: { libraryTemplateName, displayName?, description?, body, bodyParams? }
 *
 * The catalog entry stores the library name; provisioning clones it to each
 * Page (APPROVED instantly). Customers never see this — they only see the
 * provisioned APPROVED templates.
 */
export async function POST(req: Request) {
  const [admin, authErr] = await requireSuperAdminOrError();
  if (authErr) return authErr;

  let body: {
    libraryTemplateName?: string;
    displayName?: string;
    description?: string;
    body?: string;
    bodyParams?: string[];
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const libraryTemplateName = body.libraryTemplateName?.trim();
  const content = body.body?.trim();
  if (!libraryTemplateName || !/^[a-z0-9_]+$/.test(libraryTemplateName)) {
    return NextResponse.json({ error: "Valid libraryTemplateName is required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Template body is required" }, { status: 400 });
  }

  // Validate the body uses positional params (library format).
  let keys: string[];
  try {
    keys = templateKeys(content);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid template body" },
      { status: 400 }
    );
  }

  // Idempotent: return the existing catalog entry if already curated.
  const existing = await prisma.globalTemplate.findFirst({
    where: { libraryTemplateName, isActive: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, template: existing, deduped: true });
  }

  const displayName = body.displayName?.trim() ||
    libraryTemplateName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const fields = (body.bodyParams ?? []).map((example, i) => ({
    key: String(i + 1),
    label: `Value ${i + 1}`,
    example,
  }));

  const template = await prisma.globalTemplate.create({
    data: {
      name: displayName,
      description: body.description?.trim() || null,
      content,
      fields: fields.length ? fields : undefined,
      category: "Utility",
      isUtility: true,
      status: "active",
      libraryTemplateName,
      createdBy: admin.id,
    },
  });

  await logAdminAction(admin.id, "templates.library.add", template.id, "GlobalTemplate", {
    libraryTemplateName,
    paramCount: keys.length,
  });

  return NextResponse.json({ ok: true, template }, { status: 201 });
}
