import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/admin-helpers";
import AdminShell from "@/app/admin/_components/AdminShell";

export const metadata = { title: "Messaivo Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId: clerkId } = await auth();

  if (!clerkId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true, name: true, email: true },
  });

  if (!user || !isAdminRole(user.role)) redirect("/app");

  return (
    <AdminShell adminName={user.name ?? user.email} adminRole={user.role}>
      {children}
    </AdminShell>
  );
}
