import { createTransport, type Transporter } from "nodemailer";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/token-crypto";

type MailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

async function getTransporter(): Promise<{ transport: Transporter; from: string }> {
  const settings = await prisma.smtpSettings.findUnique({ where: { id: "singleton" } });
  if (!settings || !settings.host || !settings.username) {
    throw new Error("SMTP is not configured. Set it up in Admin → Settings → SMTP.");
  }
  const password = settings.passwordEnc ? decryptToken(settings.passwordEnc) : "";
  const transport = createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.username, pass: password },
  });
  const from = settings.fromName
    ? `"${settings.fromName}" <${settings.fromEmail}>`
    : settings.fromEmail;
  return { transport, from };
}

export async function sendMail(options: MailOptions): Promise<void> {
  const { transport, from } = await getTransporter();
  await transport.sendMail({ from, ...options });
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  await sendMail({
    to,
    subject: "Reset your password",
    text: `Click this link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#07090D;color:#F5F7FA;border-radius:12px">
        <h2 style="margin:0 0 8px;color:#F5F7FA;font-size:20px">Reset your password</h2>
        <p style="margin:0 0 24px;color:#8B95A7;font-size:14px">Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#6C63FF;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Reset password</a>
        <p style="margin:24px 0 0;color:#8B95A7;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function testSmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { transport } = await getTransporter();
    await transport.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
