import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Builds a valid Meta signed_request string for the given payload and secret. */
function makeSignedRequest(payload: object, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${sig}.${encodedPayload}`;
}

// ── Mock prisma before importing the module under test ────────────────────────

vi.mock("@/lib/db", () => ({
  prisma: {
    contact: {
      deleteMany: vi.fn(),
    },
    dataDeletionRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Import AFTER the mock so the module picks up the mocked prisma
import {
  parseSignedRequest,
  base64UrlDecode,
  hashUserId,
  deleteContactData,
  createDeletionRecord,
  getDeletionStatus,
} from "@/lib/data-deletion";
import { prisma } from "@/lib/db";

// ── parseSignedRequest ────────────────────────────────────────────────────────

describe("parseSignedRequest", () => {
  const SECRET = "test-app-secret";
  const USER_ID = "987654321";
  const VALID_PAYLOAD = {
    user_id: USER_ID,
    algorithm: "HMAC-SHA256",
    issued_at: 1700000000,
  };

  it("returns payload for a valid signed_request", () => {
    const sr = makeSignedRequest(VALID_PAYLOAD, SECRET);
    const result = parseSignedRequest(sr, SECRET);
    expect(result.user_id).toBe(USER_ID);
    expect(result.algorithm).toBe("HMAC-SHA256");
    expect(result.issued_at).toBe(1700000000);
  });

  it("throws on invalid signature (wrong secret)", () => {
    const sr = makeSignedRequest(VALID_PAYLOAD, SECRET);
    expect(() => parseSignedRequest(sr, "wrong-secret")).toThrow("Invalid signature");
  });

  it("throws when signed_request has no dot separator", () => {
    expect(() => parseSignedRequest("nodothere", SECRET)).toThrow(
      "Invalid signed_request format",
    );
  });

  it("throws when signed_request has more than one dot", () => {
    // Only the case with exactly one separator is valid
    expect(() => parseSignedRequest("a.b.c", SECRET)).toThrow("Invalid signed_request format");
  });

  it("throws when payload is missing user_id", () => {
    const sr = makeSignedRequest({ algorithm: "HMAC-SHA256", issued_at: 1 }, SECRET);
    expect(() => parseSignedRequest(sr, SECRET)).toThrow("Missing user_id");
  });

  it("throws on unsupported algorithm", () => {
    const sr = makeSignedRequest({ user_id: USER_ID, algorithm: "MD5", issued_at: 1 }, SECRET);
    expect(() => parseSignedRequest(sr, SECRET)).toThrow("Unsupported algorithm");
  });

  it("throws when payload is not valid JSON", () => {
    // Craft a signed_request with a valid HMAC but non-JSON payload
    const fakePayload = Buffer.from("not-json").toString("base64url");
    const sig = crypto
      .createHmac("sha256", SECRET)
      .update(fakePayload)
      .digest("base64url");
    expect(() => parseSignedRequest(`${sig}.${fakePayload}`, SECRET)).toThrow(
      "Invalid payload JSON",
    );
  });
});

// ── hashUserId ────────────────────────────────────────────────────────────────

describe("hashUserId", () => {
  it("returns a 64-character hex string (SHA-256)", () => {
    expect(hashUserId("any-user-id")).toHaveLength(64);
  });

  it("is deterministic", () => {
    expect(hashUserId("user123")).toBe(hashUserId("user123"));
  });

  it("produces different hashes for different IDs", () => {
    expect(hashUserId("user1")).not.toBe(hashUserId("user2"));
  });
});

// ── deleteContactData ─────────────────────────────────────────────────────────

describe("deleteContactData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls prisma.contact.deleteMany with the given PSID", async () => {
    const mockDelete = prisma.contact.deleteMany as ReturnType<typeof vi.fn>;
    mockDelete.mockResolvedValue({ count: 3 });

    const count = await deleteContactData("psid-abc");

    expect(mockDelete).toHaveBeenCalledWith({ where: { metaUserId: "psid-abc" } });
    expect(count).toBe(3);
  });

  it("returns 0 for an unknown user (no contacts to delete)", async () => {
    const mockDelete = prisma.contact.deleteMany as ReturnType<typeof vi.fn>;
    mockDelete.mockResolvedValue({ count: 0 });

    const count = await deleteContactData("unknown-psid");
    expect(count).toBe(0);
  });
});

// ── createDeletionRecord ──────────────────────────────────────────────────────

describe("createDeletionRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a DataDeletionRequest and returns a 32-char hex confirmation code", async () => {
    const mockCreate = prisma.dataDeletionRequest.create as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValue({});

    const code = await createDeletionRecord("psid-xyz", 2);

    expect(typeof code).toBe("string");
    expect(code).toHaveLength(32);
    expect(/^[0-9a-f]+$/.test(code)).toBe(true);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          confirmationCode: code,
          status: "COMPLETED",
          deletedContacts: 2,
        }),
      }),
    );
  });

  it("stores a hash of the PSID, not the raw user ID", async () => {
    const mockCreate = prisma.dataDeletionRequest.create as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValue({});

    const psid = "some-facebook-psid";
    await createDeletionRecord(psid, 0);

    const callArg = mockCreate.mock.calls[0][0];
    // The stored hash must not contain the raw PSID
    expect(callArg.data.userIdHash).not.toBe(psid);
    // But it must equal the deterministic SHA-256 hash
    expect(callArg.data.userIdHash).toBe(hashUserId(psid));
  });
});

// ── getDeletionStatus ─────────────────────────────────────────────────────────

describe("getDeletionStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the status record for a known confirmation code", async () => {
    const mockFindUnique = prisma.dataDeletionRequest.findUnique as ReturnType<typeof vi.fn>;
    const fixedDate = new Date("2026-01-01T00:00:00Z");
    mockFindUnique.mockResolvedValue({
      status: "COMPLETED",
      deletedContacts: 5,
      createdAt: fixedDate,
      completedAt: fixedDate,
    });

    const result = await getDeletionStatus("abc123");
    expect(result?.status).toBe("COMPLETED");
    expect(result?.deletedContacts).toBe(5);
  });

  it("returns null for an unknown confirmation code", async () => {
    const mockFindUnique = prisma.dataDeletionRequest.findUnique as ReturnType<typeof vi.fn>;
    mockFindUnique.mockResolvedValue(null);

    const result = await getDeletionStatus("does-not-exist");
    expect(result).toBeNull();
  });
});
