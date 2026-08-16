import { prisma } from "@/lib/db";
import { requireAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, serverError } from "@/lib/api-helpers";

const DEFAULTS = {
  loginHeading: "Welcome back",
  loginDescription: "Sign in to your Messaivo workspace.",
  signupHeading: "Create your account",
  signupDescription: "Start managing customer conversations today.",
  dashboardHeading: "Welcome to Messaivo",
  dashboardDescription: "Manage your customer conversations from one place.",
  supportText: "Need help? Contact our support team.",
  supportEmail: "",
  footerText: "© 2025 Messaivo. All rights reserved.",
  copyrightText: "© 2025 Messaivo",
};

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const content = await prisma.siteContent.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...DEFAULTS },
      update: {},
    });
    return ok({ content });
  } catch (e) {
    console.error("[GET /api/admin/content]", e);
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
    const str = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : undefined);
    const content = await prisma.siteContent.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...DEFAULTS, updatedBy: admin.id },
      update: {
        loginHeading: str("loginHeading"),
        loginDescription: str("loginDescription"),
        signupHeading: str("signupHeading"),
        signupDescription: str("signupDescription"),
        dashboardHeading: str("dashboardHeading"),
        dashboardDescription: str("dashboardDescription"),
        supportText: str("supportText"),
        supportEmail: str("supportEmail"),
        footerText: str("footerText"),
        copyrightText: str("copyrightText"),
        updatedBy: admin.id,
      },
    });
    await logAdminAction(admin.id, "UPDATE_SITE_CONTENT", "singleton", "SiteContent");
    return ok({ content });
  } catch (e) {
    console.error("[PUT /api/admin/content]", e);
    return serverError();
  }
}
