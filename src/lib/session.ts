import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "msv_session";
const DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60, // seconds
  path: "/",
};

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      userId,
      token: hashToken(raw),
      expiresAt: new Date(Date.now() + DURATION_MS),
    },
  });
  return raw;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
};

export async function getSessionUser(rawToken: string | undefined): Promise<SessionUser | null> {
  if (!rawToken) return null;
  const session = await prisma.session.findUnique({
    where: { token: hashToken(rawToken) },
    include: {
      user: { select: { id: true, email: true, name: true, role: true, status: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user.status === "ACTIVE" ? session.user : null;
}

export async function deleteSessionByRaw(rawToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token: hashToken(rawToken) } }).catch(() => {});
}

// Purge expired sessions — call from a cleanup cron or on login
export async function purgeExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
}
