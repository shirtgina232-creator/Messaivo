import { prisma } from "@/lib/db";
import { requireAdminOrError, requireSuperAdminOrError, logAdminAction } from "@/lib/admin-helpers";
import { ok, badRequest, serverError } from "@/lib/api-helpers";

const DEFAULTS = {
  appName: "Messaivo",
  companyName: "Messaivo",
  supportEmail: "",
  websiteUrl: "",
  timezone: "UTC",
  senderName: "Messaivo",
  senderEmail: "",
  maintenanceMode: false,
  signupEnabled: true,
  workspaceCreationEnabled: true,
  auditLogRetentionDays: 90,
};

export async function GET() {
  const [, err] = await requireAdminOrError();
  if (err) return err;
  try {
    const settings = await prisma.globalSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...DEFAULTS },
      update: {},
    });
    return ok({ settings });
  } catch (e) {
    console.error("[GET /api/admin/settings]", e);
    return serverError();
  }
}

export async function PUT(req: Request) {
  const [admin, err] = await requireSuperAdminOrError();
  if (err) return err;
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const data = body as Record<string, unknown>;
    const str = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : undefined);
    const bool = (k: string) => (typeof data[k] === "boolean" ? (data[k] as boolean) : undefined);
    const num = (k: string) => (typeof data[k] === "number" ? (data[k] as number) : undefined);
    const settings = await prisma.globalSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...DEFAULTS, updatedBy: admin.id },
      update: {
        appName: str("appName"),
        companyName: str("companyName"),
        supportEmail: str("supportEmail"),
        websiteUrl: str("websiteUrl"),
        timezone: str("timezone"),
        senderName: str("senderName"),
        senderEmail: str("senderEmail"),
        maintenanceMode: bool("maintenanceMode"),
        signupEnabled: bool("signupEnabled"),
        workspaceCreationEnabled: bool("workspaceCreationEnabled"),
        auditLogRetentionDays: num("auditLogRetentionDays"),
        updatedBy: admin.id,
      },
    });
    await logAdminAction(admin.id, "UPDATE_GLOBAL_SETTINGS", "singleton", "GlobalSettings");
    return ok({ settings });
  } catch (e) {
    console.error("[PUT /api/admin/settings]", e);
    return serverError();
  }
}
