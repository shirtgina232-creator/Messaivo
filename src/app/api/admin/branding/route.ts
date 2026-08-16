import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, serverError } from "@/lib/api-helpers";

const DEFAULTS = {
  brandName: "Messaivo",
  browserTitle: "Messaivo",
  supportEmail: "",
  companyName: "Messaivo",
};

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const branding = await prisma.siteBranding.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...DEFAULTS },
      update: {},
    });
    return ok({ branding });
  } catch (e) {
    console.error("[GET /api/admin/branding]", e);
    return serverError();
  }
}

export async function PUT(req: Request) {
  const [admin, err] = await requireAdminOrError();
  if (err) return err;
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const data = body as Record<string, unknown>;
    const branding = await prisma.siteBranding.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        brandName: typeof data.brandName === "string" ? data.brandName : DEFAULTS.brandName,
        logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : undefined,
        faviconUrl: typeof data.faviconUrl === "string" ? data.faviconUrl : undefined,
        loginLogoUrl: typeof data.loginLogoUrl === "string" ? data.loginLogoUrl : undefined,
        dashboardLogoUrl: typeof data.dashboardLogoUrl === "string" ? data.dashboardLogoUrl : undefined,
        browserTitle: typeof data.browserTitle === "string" ? data.browserTitle : DEFAULTS.browserTitle,
        supportEmail: typeof data.supportEmail === "string" ? data.supportEmail : DEFAULTS.supportEmail,
        companyName: typeof data.companyName === "string" ? data.companyName : DEFAULTS.companyName,
        updatedBy: admin.id,
      },
      update: {
        brandName: typeof data.brandName === "string" ? data.brandName : undefined,
        logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : undefined,
        faviconUrl: typeof data.faviconUrl === "string" ? data.faviconUrl : undefined,
        loginLogoUrl: typeof data.loginLogoUrl === "string" ? data.loginLogoUrl : undefined,
        dashboardLogoUrl: typeof data.dashboardLogoUrl === "string" ? data.dashboardLogoUrl : undefined,
        browserTitle: typeof data.browserTitle === "string" ? data.browserTitle : undefined,
        supportEmail: typeof data.supportEmail === "string" ? data.supportEmail : undefined,
        companyName: typeof data.companyName === "string" ? data.companyName : undefined,
        updatedBy: admin.id,
      },
    });
    await logAdminAction(admin.id, "UPDATE_BRANDING", "singleton", "SiteBranding");
    return ok({ branding });
  } catch (e) {
    console.error("[PUT /api/admin/branding]", e);
    return serverError();
  }
}
