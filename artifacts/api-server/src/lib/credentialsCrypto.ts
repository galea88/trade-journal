import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const explicit = process.env.BROKER_ENCRYPTION_KEY;
  if (explicit) {
    const buf = Buffer.from(explicit, "hex");
    if (buf.length >= KEY_LENGTH) return buf.subarray(0, KEY_LENGTH);
    return crypto.scryptSync(explicit, "broker-creds-salt", KEY_LENGTH) as Buffer;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "Cannot derive broker encryption key: DATABASE_URL is not set.",
    );
  }
  return crypto.scryptSync(dbUrl, "broker-creds-key-v1", KEY_LENGTH) as Buffer;
}

export function encryptCredentials(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

export function decryptCredentials(ciphertext: string): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
