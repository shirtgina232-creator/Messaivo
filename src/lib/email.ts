/**
 * Transactional email service.
 *
 * Priority:
 *   1. Resend HTTP API  — if RESEND_API_KEY is set (works on Vercel; no TCP port blocked)
 *   2. SMTP via nodemailer — if SMTP is configured in Admin → Settings (self-hosted / local)
 *
 * Vercel blocks outbound TCP on port 587/465/25 in serverless functions,
 * so SMTP-only setups will fail there. Set RESEND_API_KEY in Vercel env vars
 * to enable email on the Vercel deployment.
 */

import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/token-crypto";

export type MailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

// ── Resend (HTTP, Vercel-safe) ────────────────────────────────────────────────

async function sendViaResend(options: MailOptions, fromAddress: string): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  if (error) throw new Error(error.message ?? "Resend: failed to send email");
}

// ── SMTP (nodemailer, self-hosted) ────────────────────────────────────────────

async function getSmtpTransporter() {
  const { createTransport } = await import("nodemailer");
  const settings = await prisma.smtpSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.host || !settings.username) {
    throw new Error("Email is not configured. Add RESEND_API_KEY (recommended) or configure SMTP in Admin → Settings.");
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

// ── Resolve from address for Resend ──────────────────────────────────────────

async function getResendFrom(): Promise<string> {
  // Use DB "from" config if available, otherwise fall back to env / default
  try {
    const settings = await prisma.smtpSettings.findUnique({
      where: { id: "singleton" },
      select: { fromName: true, fromEmail: true },
    });
    if (settings?.fromEmail) {
      return settings.fromName
        ? `"${settings.fromName}" <${settings.fromEmail}>`
        : settings.fromEmail;
    }
  } catch { /* ignore */ }
  // Resend requires a verified sender; this default works with Resend's sandbox domain
  return process.env.RESEND_FROM ?? "Messaivo <onboarding@resend.dev>";
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendMail(options: MailOptions): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const from = await getResendFrom();
    return sendViaResend(options, from);
  }
  const { transport, from } = await getSmtpTransporter();
  await transport.sendMail({ from, ...options });
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  await sendMail({
    to,
    subject: "Reset your Messaivo password",
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
  if (process.env.RESEND_API_KEY) {
    // Resend has no "verify" call — a live send is the only test
    return { ok: true };
  }
  try {
    const { transport } = await getSmtpTransporter();
    await transport.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
