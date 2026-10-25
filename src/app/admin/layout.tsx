import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE } from "@/lib/session";
import { isAdminRole } from "@/lib/admin-helpers";
import AdminShell from "@/app/admin/_components/AdminShell";

export const metadata = { title: "Messaivo Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const sessionUser = await getSessionUser(raw);

  if (!sessionUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { role: true, name: true, email: true },
  });

  if (!user || !isAdminRole(user.role)) redirect("/app");

  return (
    <AdminShell adminName={user.name ?? user.email} adminRole={user.role}>
      {children}
    </AdminShell>
  );
}
