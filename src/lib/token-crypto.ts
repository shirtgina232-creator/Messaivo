import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// Tokens with this prefix are AES-256-GCM encrypted; plaintext tokens have no prefix (legacy).
const ENC_PREFIX = "enc:";

function getKey(): Buffer {
  const hex = process.env.META_TOKEN_ENCRYPTION_KEY ?? "";
  if (hex.length < 64) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "META_TOKEN_ENCRYPTION_KEY must be set to a 32-byte (64 hex char) value in production. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      );
    }
    // Development fallback — log once per process
    if (!getKey._warned) {
      console.warn(
        "[token-crypto] META_TOKEN_ENCRYPTION_KEY not set; tokens stored as plaintext. " +
        "Set a 64-char hex key before going to production."
      );
      getKey._warned = true;
    }
    return Buffer.alloc(32, 0);
  }
  return Buffer.from(hex.slice(0, 64), "hex");
}
getKey._warned = false;

export function encryptToken(plaintext: string): string {
  const key = getKey();
  // In dev with no key set, store plaintext so existing plaintext tokens remain compatible
  if (key.equals(Buffer.alloc(32, 0)) && process.env.NODE_ENV !== "production") {
    return plaintext;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: iv(12 bytes) + tag(16 bytes) + ciphertext
  return ENC_PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) {
    // Legacy plaintext token — return as-is (pre-encryption migration)
    return stored;
  }
  const key = getKey();
  const buf = Buffer.from(stored.slice(ENC_PREFIX.length), "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
