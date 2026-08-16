import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Workspace } from "@prisma/client";

// ── Response factories ────────────────────────────────────────────────────────

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });
export const created = <T>(data: T) => NextResponse.json(data, { status: 201 });
export const noContent = () => new NextResponse(null, { status: 204 });
export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });
export const notFound = (msg = "Not found") => NextResponse.json({ error: msg }, { status: 404 });
export const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });
export const serverError = () =>
  NextResponse.json({ error: "Internal server error" }, { status: 500 });

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Resolves the current request's authenticated workspace from the database.
 * Returns null if the user is unauthenticated or has no workspace yet.
 * Call this inside every API route handler.
 */
export async function getWorkspace(): Promise<Workspace | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { workspace: true },
  });

  return user?.workspace ?? null;
}
