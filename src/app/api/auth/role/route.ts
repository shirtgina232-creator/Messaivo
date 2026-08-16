import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Returns the authenticated user's role from the database.
// Called client-side after signIn.finalize() to determine redirect destination.
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ role: null }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });

  return NextResponse.json({ role: user?.role ?? "USER" });
}
