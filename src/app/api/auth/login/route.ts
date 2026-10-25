import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, SESSION_COOKIE, COOKIE_OPTIONS } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: (email as string).toLowerCase().trim() },
      select: { id: true, passwordHash: true, status: true, role: true },
    });

    // Constant-time comparison even when user doesn't exist
    const hash = user?.passwordHash ?? "$2b$12$invalidhashplaceholdertoresisttimingatk";
    const valid = await bcrypt.compare(password as string, hash);

    if (!user || !valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const token = await createSession(user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, COOKIE_OPTIONS);

    return NextResponse.json({ ok: true, role: user.role });
  } catch (e) {
    console.error("[POST /api/auth/login]", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
