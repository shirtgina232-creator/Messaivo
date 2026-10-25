import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUser } from "@/lib/admin-helpers";
import { encryptToken } from "@/lib/token-crypto";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const smtp = await prisma.smtpSettings.findUnique({ where: { id: "singleton" } });
  if (!smtp) return NextResponse.json({ smtp: null });

  return NextResponse.json({
    smtp: {
      host:      smtp.host,
      port:      smtp.port,
      secure:    smtp.secure,
      username:  smtp.username,
      fromName:  smtp.fromName,
      fromEmail: smtp.fromEmail,
      hasPassword: !!smtp.passwordEnc,
    },
  });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    host?: string; port?: number; secure?: boolean;
    username?: string; password?: string;
    fromName?: string; fromEmail?: string;
  };

  const { host, port, secure, username, password, fromName, fromEmail } = body;
  if (!host || !port || !username || !fromEmail) {
    return NextResponse.json({ error: "host, port, username, and fromEmail are required" }, { status: 400 });
  }

  const data: {
    host: string; port: number; secure: boolean;
    username: string; fromName: string; fromEmail: string;
    passwordEnc?: string;
  } = {
    host: host.trim(),
    port: Number(port),
    secure: Boolean(secure),
    username: username.trim(),
    fromName: (fromName ?? "").trim(),
    fromEmail: fromEmail.trim(),
  };

  if (password) {
    data.passwordEnc = encryptToken(password);
  }

  await prisma.smtpSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data, passwordEnc: data.passwordEnc ?? "" },
    update: data,
  });

  return NextResponse.json({ ok: true });
}
