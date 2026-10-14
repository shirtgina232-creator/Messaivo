import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminOrError, logAdminAction } from "@/lib/admin-helpers";

/**
 * DELETE /api/admin/templates/library/[id]
 * Super Admin only. Removes a library template from the catalog (soft-delete).
 * Existing Page clones keep working — they belong to the Page now.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [admin, authErr] = await requireSuperAdminOrError();
  if (authErr) return authErr;

  const { id } = await params;
  const template = await prisma.globalTemplate.findFirst({
    where: { id, libraryTemplateName: { not: null } },
  });
  if (!template) {
    return NextResponse.json({ error: "Library catalog template not found" }, { status: 404 });
  }

  const updated = await prisma.globalTemplate.update({
    where: { id },
    data: { isActive: false, status: "inactive" },
  });

  await logAdminAction(admin.id, "templates.library.remove", id, "GlobalTemplate", {
    libraryTemplateName: template.libraryTemplateName,
  });

  return NextResponse.json({ ok: true, template: updated });
}
