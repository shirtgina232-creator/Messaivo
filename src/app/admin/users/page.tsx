import { prisma } from "@/lib/db";
import UsersManager from "./_components/UsersManager";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, email: true, name: true, role: true, status: true, createdAt: true,
      workspace: { select: { id: true, name: true, planId: true, creditLedger: { select: { monthlyAllocation: true, usedThisPeriod: true } } } },
    },
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Users</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>All registered users. Search, filter, suspend, or change roles.</p>
      </div>
      <UsersManager initialUsers={users} />
    </div>
  );
}
