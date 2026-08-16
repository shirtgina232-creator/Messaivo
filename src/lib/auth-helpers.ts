import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

// Emails listed here get ADMIN role on first DB sync. Server-side only.
// Set INITIAL_ADMIN_EMAILS=email1@example.com,email2@example.com in .env.local.
function resolveRole(email: string): "USER" | "ADMIN" {
  const adminEmails = (process.env.INITIAL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase()) ? "ADMIN" : "USER";
}

/**
 * Get-or-create the authenticated user's database record + workspace.
 * Safe to call on every /app page load — no-ops when records already exist.
 * Only fetches the Clerk profile when the DB record is missing (slow path).
 */
export async function ensureUserWorkspace(): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return;

  // Fast path: both records exist — single query, no Clerk API call
  const existing = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, workspace: { select: { id: true } } },
  });
  if (existing?.workspace) return;

  // Slow path: fetch Clerk profile for email / name
  const clerkUser = await currentUser();
  if (!clerkUser) return;

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const workspaceName = name ? `${name.split(" ")[0]}'s Workspace` : "My Workspace";
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const role = resolveRole(email);

  if (!existing) {
    // Create user + workspace + ledger atomically via nested writes
    try {
      await prisma.user.create({
        data: {
          clerkId,
          email,
          name,
          avatarUrl: clerkUser.imageUrl || null,
          role,
          workspace: {
            create: {
              name: workspaceName,
              planId: "lite",
              creditLedger: {
                create: {
                  monthlyAllocation: 30_000,
                  bonusCredits: 0,
                  usedThisPeriod: 0,
                  periodStart: new Date(),
                  periodEnd,
                },
              },
            },
          },
        },
      });
    } catch (e) {
      // P2002: race condition — another concurrent request already created this user
      if (!isUniqueViolation(e)) throw e;
    }
    return;
  }

  // User exists but has no workspace — create it
  try {
    await prisma.workspace.create({
      data: {
        userId: existing.id,
        name: workspaceName,
        planId: "lite",
        creditLedger: {
          create: {
            monthlyAllocation: 30_000,
            bonusCredits: 0,
            usedThisPeriod: 0,
            periodStart: new Date(),
            periodEnd,
          },
        },
      },
    });
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
  }
}
