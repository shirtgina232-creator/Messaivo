import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createUserWithWorkspace } from "@/lib/auth-helpers";
import { createSession, SESSION_COOKIE, COOKIE_OPTIONS } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body as { email?: string; password?: string; name?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check signup is enabled
    const settings = await prisma.globalSettings.findUnique({ where: { id: "singleton" } });
    if (settings && !settings.signupEnabled) {
      return NextResponse.json({ error: "Signups are currently disabled" }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await createUserWithWorkspace({
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
      passwordHash,
    });

    const token = await createSession(userId);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, COOKIE_OPTIONS);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signup failed";
    if (msg === "Email already registered") {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error("[POST /api/auth/signup]", e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
