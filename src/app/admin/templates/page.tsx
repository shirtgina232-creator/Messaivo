import { prisma } from "@/lib/db";
import type { GlobalTemplate } from "@prisma/client";
import AdminTemplatesTabs from "./_components/AdminTemplatesTabs";

export default async function AdminTemplatesPage() {
  const templates: GlobalTemplate[] = await prisma.globalTemplate.findMany({ orderBy: { createdAt: "desc" } });
  const catalog: GlobalTemplate[] = await prisma.globalTemplate.findMany({
    where: { libraryTemplateName: { not: null }, isActive: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Template Management</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>
          <strong style={{ color: "#10B981" }}>Library</strong> templates are Meta pre-approved and provisioned to every Page automatically.
          <strong style={{ color: "#8B85FF" }}> Custom</strong> templates are Super Admin-only and require Meta review.
        </p>
      </div>
      <AdminTemplatesTabs initialTemplates={templates} initialCatalog={catalog} />
    </div>
  );
}
