import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminUser, isAdminRole } from "@/lib/admin-helpers";
import SettingsForm from "./_components/SettingsForm";

export default async function AdminSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");
  if (!isAdminRole(adminUser.role)) redirect("/app");

  const isSuperAdmin = adminUser.role === "SUPER_ADMIN";

  const settings = await prisma.globalSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton", appName: "Messaivo", companyName: "Messaivo",
      supportEmail: "", websiteUrl: "", timezone: "UTC", senderName: "Messaivo",
      senderEmail: "", maintenanceMode: false, signupEnabled: true,
      workspaceCreationEnabled: true, auditLogRetentionDays: 90,
    },
    update: {},
  });

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Platform Settings</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>
          {isSuperAdmin ? "Global configuration for the platform." : "View-only. SUPER_ADMIN required to edit."}
        </p>
      </div>
      {!isSuperAdmin && (
        <div className="p-4 rounded-xl mb-5 text-[12.5px]" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
          You need SUPER_ADMIN access to modify these settings.
        </div>
      )}
      <SettingsForm initial={settings} readOnly={!isSuperAdmin} />
    </div>
  );
}
