import crypto from "crypto";
import { prisma } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SignedRequestPayload {
  user_id: string;
  algorithm: string;
  issued_at: number;
}

// ── Signed-request parsing ────────────────────────────────────────────────────

/**
 * Decodes and verifies a Meta signed_request.
 * Format: base64url(HMAC-SHA256(payload, APP_SECRET)) + "." + base64url(JSON payload)
 * Throws on invalid format, bad signature, or unsupported algorithm.
 */
export function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): SignedRequestPayload {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) throw new Error("Invalid signed_request format");

  const [encodedSig, encodedPayload] = parts;

  const sig = base64UrlDecode(encodedSig);
  const expected = crypto.createHmac("sha256", appSecret).update(encodedPayload).digest();

  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) {
    throw new Error("Invalid signature");
  }

  let data: SignedRequestPayload;
  try {
    data = JSON.parse(base64UrlDecode(encodedPayload).toString("utf-8"));
  } catch {
    throw new Error("Invalid payload JSON");
  }

  if (!data.user_id) throw new Error("Missing user_id in payload");
  if (data.algorithm?.toUpperCase() !== "HMAC-SHA256") throw new Error("Unsupported algorithm");

  return data;
}

export function base64UrlDecode(str: string): Buffer {
  // Convert base64url → base64, then decode
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// ── PSID hashing — never store the raw Facebook user ID ──────────────────────

export function hashUserId(userId: string): string {
  return crypto.createHash("sha256").update(userId).digest("hex");
}

// ── Deletion ──────────────────────────────────────────────────────────────────

/**
 * Deletes all Contact records for a given Facebook PSID across all workspaces.
 * Conversations, Messages, BroadcastRecipients, and ContactGroupMembers are
 * removed automatically by the Prisma cascade relations.
 */
export async function deleteContactData(metaUserId: string): Promise<number> {
  const result = await prisma.contact.deleteMany({ where: { metaUserId } });
  return result.count;
}

// ── Deletion record ───────────────────────────────────────────────────────────

export async function createDeletionRecord(
  metaUserId: string,
  deletedContacts: number,
): Promise<string> {
  const confirmationCode = crypto.randomBytes(16).toString("hex");
  const userIdHash = hashUserId(metaUserId);

  await prisma.dataDeletionRequest.create({
    data: {
      confirmationCode,
      userIdHash,
      status: "COMPLETED",
      deletedContacts,
      completedAt: new Date(),
    },
  });

  return confirmationCode;
}

// ── Status lookup ─────────────────────────────────────────────────────────────

export async function getDeletionStatus(confirmationCode: string) {
  return prisma.dataDeletionRequest.findUnique({
    where: { confirmationCode },
    select: {
      status: true,
      deletedContacts: true,
      createdAt: true,
      completedAt: true,
    },
  });
}
