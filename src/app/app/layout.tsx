import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ensureUserWorkspace } from "@/lib/auth-helpers";
import AppShell from "@/components/app/AppShell";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();

  // Get-or-create the user's DB record + workspace without requiring the Clerk webhook.
  try {
    await ensureUserWorkspace();
  } catch (e) {
    console.error("[AppLayout] ensureUserWorkspace failed:", e);
  }

  // Fetch initial workspace data to hydrate the client-side WorkspaceProvider.
  // This avoids a loading flicker on first render — the client-side sync via
  // /api/credits still runs to keep the data fresh.
  let initialPlanId = "lite";
  let initialLedger: {
    monthlyAllocation: number;
    bonusCredits: number;
    usedThisPeriod: number;
    periodEnd: Date | null;
    unlimitedCredits: boolean;
  } | null = null;
  let initialUserName: string | null = null;

  try {
    const { userId: clerkId } = await auth();
    if (clerkId) {
      const userData = await prisma.user.findUnique({
        where: { clerkId },
        select: {
          name: true,
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
      if (userData?.workspace?.planId) initialPlanId = userData.workspace.planId;
      if (userData?.workspace?.creditLedger) initialLedger = userData.workspace.creditLedger;
    }
  } catch (e) {
    console.error("[AppLayout] workspace fetch failed:", e);
  }

  return (
    <WorkspaceProvider
      initialPlanId={initialPlanId}
      initialLedger={initialLedger}
      initialUserName={initialUserName}
    >
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
