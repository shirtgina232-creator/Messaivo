import { prisma } from "@/lib/db";
import PlansManager from "./_components/PlansManager";

export default async function AdminPlansPage() {
  const [plans, breakdown] = await Promise.all([
    prisma.plan.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.workspace.groupBy({ by: ["planId"], _count: { planId: true } }),
  ]);
  const workspaceCountMap = Object.fromEntries(breakdown.map((r) => [r.planId, r._count.planId]));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Plans</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Manage pricing plans and features. SUPER_ADMIN only for create/edit/delete.</p>
      </div>
      <PlansManager initialPlans={plans} workspaceCountMap={workspaceCountMap} />
    </div>
  );
}
