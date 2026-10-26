import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const raw = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[a-fA-F0-9]{64}$/.test(raw)) throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hexadecimal characters.");
  return Buffer.from(raw, "hex");
}

export function encryptCalendarToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptCalendarToken(value: string): string {
  const [version, ivRaw, tagRaw, cipherRaw] = value.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !cipherRaw) throw new Error("Stored calendar credential format is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(cipherRaw, "base64url")), decipher.final()]).toString("utf8");
}
