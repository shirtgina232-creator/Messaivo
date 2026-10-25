import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    const raw = jar.get(SESSION_COOKIE)?.value;
    const sessionUser = await getSessionUser(raw);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json() as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both passwords are required" }, { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { passwordHash: true },
    });

    const hash = user?.passwordHash ?? "$2b$12$invalidhashplaceholdertoresisttimingatk";
    const valid = await bcrypt.compare(currentPassword, hash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: sessionUser.id }, data: { passwordHash: newHash } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/auth/change-password]", e);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
