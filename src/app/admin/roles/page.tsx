import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import RolesManager from "./_components/RolesManager";

export default async function AdminRolesPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/login");

  const currentUser = await prisma.user.findUnique({ where: { clerkId }, select: { role: true, id: true } });
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Admin Roles</h1>
        </div>
        <div className="p-4 rounded-xl text-[12.5px]" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
          SUPER_ADMIN access required to manage admin roles.
        </div>
      </div>
    );
  }

  const [adminUsers, allUsers] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN", "SUPPORT", "FINANCE"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, clerkId: true, email: true, name: true, role: true, createdAt: true },
    }),
    prisma.user.count(),
  ]);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Admin Roles</h1>
        <p className="text-[13px]" style={{ color: "#8B95A7" }}>Manage admin access and role assignments. SUPER_ADMIN only.</p>
      </div>
      <RolesManager adminUsers={adminUsers} currentUserId={currentUser.id} totalUsers={allUsers} />
    </div>
  );
}
