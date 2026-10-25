import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, SESSION_COOKIE, COOKIE_OPTIONS } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json() as { token?: string; password?: string };

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
      include: { user: { select: { id: true, status: true } } },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      if (resetToken) await prisma.passwordResetToken.delete({ where: { id: resetToken.id } }).catch(() => {});
      return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
    }
    if (resetToken.user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } }),
      prisma.session.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    const sessionToken = await createSession(resetToken.userId);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionToken, COOKIE_OPTIONS);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/auth/reset-password]", e);
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}
