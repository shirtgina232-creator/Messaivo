import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json() as { email?: string };
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    // Always return success to prevent user enumeration
    if (!user) return NextResponse.json({ ok: true });

    const raw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.messaivo.com";
    const resetLink = `${appUrl}/reset-password?token=${raw}`;

    try {
      await sendPasswordResetEmail(email, resetLink);
    } catch (mailErr) {
      console.error("[forgot-password] email send failed:", mailErr);
      // Don't expose mail errors to the client
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/auth/forgot-password]", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
