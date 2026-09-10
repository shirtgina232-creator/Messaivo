import { prisma } from "@/lib/db";
import TemplatesManager from "./_components/TemplatesManager";

export default async function AdminTemplatesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templates = (await prisma.globalTemplate.findMany({ orderBy: { createdAt: "desc" } })) as any[];
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Template Management</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>
          Create and manage message templates. Only <strong style={{ color: "#10B981" }}>Active</strong> templates are visible to customers in the Broadcast template picker.
        </p>
      </div>
      <TemplatesManager initialTemplates={templates} />
    </div>
  );
}
