import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE } from "@/lib/session";
import AppShell from "@/components/app/AppShell";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const sessionUser = await getSessionUser(raw);
  if (!sessionUser) redirect("/login");

  let initialPlanId = "lite";
  let initialLedger: {
    monthlyAllocation: number;
    bonusCredits: number;
    usedThisPeriod: number;
    periodEnd: Date | null;
    unlimitedCredits: boolean;
  } | null = null;
  let initialUserName: string | null = null;
  let initialUserEmail: string | null = null;

  try {
    const userData = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        name: true,
        email: true,
        workspace: {
          select: {
            planId: true,
            creditLedger: {
              select: {
                monthlyAllocation: true,
                bonusCredits: true,
                usedThisPeriod: true,
                periodEnd: true,
                unlimitedCredits: true,
              },
            },
          },
        },
      },
    });
    initialUserName = userData?.name ?? null;
    initialUserEmail = userData?.email ?? null;
    if (userData?.workspace?.planId) initialPlanId = userData.workspace.planId;
    if (userData?.workspace?.creditLedger) initialLedger = userData.workspace.creditLedger;
  } catch (e) {
    console.error("[AppLayout] workspace fetch failed:", e);
  }

  return (
    <WorkspaceProvider
      initialPlanId={initialPlanId}
      initialLedger={initialLedger}
      initialUserName={initialUserName}
      initialUserEmail={initialUserEmail}
    >
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
