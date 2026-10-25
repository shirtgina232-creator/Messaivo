import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

// Emails listed here get ADMIN role on first signup. Server-side only.
// Set INITIAL_ADMIN_EMAILS=email1@example.com,email2@example.com in .env.local.
function resolveRole(email: string): "USER" | "ADMIN" {
  const adminEmails = (process.env.INITIAL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase()) ? "ADMIN" : "USER";
}

export type CreateUserInput = {
  email: string;
  name?: string | null;
  passwordHash: string;
  avatarUrl?: string | null;
};

/**
 * Create user + workspace + credit ledger atomically at signup.
 * Returns the new user id.
 */
export async function createUserWithWorkspace(input: CreateUserInput): Promise<string> {
  const { email, name, passwordHash, avatarUrl } = input;
  const workspaceName = name ? `${name.split(" ")[0]}'s Workspace` : "My Workspace";
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const role = resolveRole(email);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        avatarUrl: avatarUrl ?? null,
        passwordHash,
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
      select: { id: true },
    });
    return user.id;
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("Email already registered");
    throw e;
  }
}
