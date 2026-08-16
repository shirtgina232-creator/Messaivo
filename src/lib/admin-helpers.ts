import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "FINANCE"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

type AdminUser = { id: string; clerkId: string; email: string; name: string | null; role: string };

export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  return prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, clerkId: true, email: true, name: true, role: true },
  });
}

export async function requireAdminWithRoles(
  allowedRoles: AdminRole[]
): Promise<[AdminUser, null] | [null, NextResponse]> {
  const user = await getAdminUser();
  if (!user) return [null, NextResponse.json({ error: "Unauthorized" }, { status: 401 })];
  if (!allowedRoles.includes(user.role as AdminRole))
    return [null, NextResponse.json({ error: "Forbidden" }, { status: 403 })];
  return [user, null];
}

// Any admin role
export async function requireAdminOrError(): Promise<[AdminUser, null] | [null, NextResponse]> {
  return requireAdminWithRoles(["SUPER_ADMIN", "ADMIN", "SUPPORT", "FINANCE"]);
}

// SUPER_ADMIN only
export async function requireSuperAdminOrError(): Promise<[AdminUser, null] | [null, NextResponse]> {
  return requireAdminWithRoles(["SUPER_ADMIN"]);
}

// SUPER_ADMIN or FINANCE
export async function requireFinanceOrError(): Promise<[AdminUser, null] | [null, NextResponse]> {
  return requireAdminWithRoles(["SUPER_ADMIN", "FINANCE"]);
}

// SUPER_ADMIN, ADMIN, or SUPPORT
export async function requireSupportOrError(): Promise<[AdminUser, null] | [null, NextResponse]> {
  return requireAdminWithRoles(["SUPER_ADMIN", "ADMIN", "SUPPORT"]);
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetId?: string,
  targetType?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetId: targetId ?? null,
        targetType: targetType ?? null,
        details: (details as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (e) {
    console.error("[logAdminAction] Failed to write audit log:", e);
  }
}
