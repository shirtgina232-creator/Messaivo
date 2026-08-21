import { prisma } from "@/lib/db";
import TemplatesManager from "./_components/TemplatesManager";

export default async function AdminTemplatesPage() {
  const raw = await prisma.globalTemplate.findMany({ orderBy: { createdAt: "desc" } });
  // Cast Prisma's JsonValue fields to the typed shape used by the client component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templates = raw as any[];
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Global Templates</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Platform-wide message templates available to all workspaces.</p>
      </div>
      <TemplatesManager initialTemplates={templates} />
    </div>
  );
}
