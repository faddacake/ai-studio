/**
 * Server-side helper to resolve a provider's API key from the DB.
 *
 * Reads the encrypted row from providerConfigs, reconstructs the
 * EncryptedData shape (salt is stored as "{salt}:{ciphertext}" in
 * apiKeyEncrypted), and decrypts with @aistudio/crypto.
 *
 * Returns the plaintext key, or null if the provider is not configured.
 * Never throws — callers should treat null as "not configured".
 */

import { getDb, schema } from "@aistudio/db";
import { decrypt } from "@aistudio/crypto";
import { eq } from "drizzle-orm";

export function resolveProviderKey(providerId: string): string | null {
  try {
    const db = getDb();
    const row = db
      .select({
        apiKeyEncrypted: schema.providerConfigs.apiKeyEncrypted,
        iv: schema.providerConfigs.iv,
        authTag: schema.providerConfigs.authTag,
      })
      .from(schema.providerConfigs)
      .where(eq(schema.providerConfigs.id, providerId))
      .get();

    if (!row) return null;

    // apiKeyEncrypted is stored as "{salt}:{ciphertext}"
    const colonIdx = row.apiKeyEncrypted.indexOf(":");
    if (colonIdx === -1) return null;

    const salt = row.apiKeyEncrypted.slice(0, colonIdx);
    const ciphertext = row.apiKeyEncrypted.slice(colonIdx + 1);

    return decrypt({ salt, ciphertext, iv: row.iv, authTag: row.authTag });
  } catch {
    return null;
  }
}
