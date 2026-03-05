import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const encoded = process.env.BANK_TOKEN_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("BANK_TOKEN_ENCRYPTION_KEY is required");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("BANK_TOKEN_ENCRYPTION_KEY must be base64 for exactly 32 bytes");
  }
  return key;
}

export function encryptToken(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(encoded: string): string {
  const key = getKey();
  const [ivB64, tagB64, payloadB64] = encoded.split(":");
  if (!ivB64 || !tagB64 || !payloadB64) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const payload = Buffer.from(payloadB64, "base64");

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(payload), decipher.final()]);
  return plain.toString("utf8");
}
