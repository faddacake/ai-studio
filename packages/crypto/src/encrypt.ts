import crypto from "node:crypto";
import { getMasterKey } from "./masterKey.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;

function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
}

export interface EncryptedData {
  ciphertext: string; // hex
  iv: string; // hex
  authTag: string; // hex
  salt: string; // hex
}

export function encrypt(plaintext: string, dataDir?: string): EncryptedData {
  const masterKey = getMasterKey(dataDir);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    salt: salt.toString("hex"),
  };
}

export function decrypt(data: EncryptedData, dataDir?: string): string {
  const masterKey = getMasterKey(dataDir);
  const salt = Buffer.from(data.salt, "hex");
  const derivedKey = deriveKey(masterKey, salt);
  const iv = Buffer.from(data.iv, "hex");
  const authTag = Buffer.from(data.authTag, "hex");
  const ciphertext = Buffer.from(data.ciphertext, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString("utf-8");
}
