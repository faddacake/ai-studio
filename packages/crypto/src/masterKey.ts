import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const KEY_LENGTH = 32; // 256 bits

let _masterKey: Buffer | null = null;

export function getMasterKey(dataDir?: string): Buffer {
  if (_masterKey) return _masterKey;

  // 1. Try environment variable
  const envKey = process.env.MASTER_KEY;
  if (envKey) {
    _masterKey = Buffer.from(envKey, "hex");
    if (_masterKey.length !== KEY_LENGTH) {
      throw new Error(`MASTER_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
    }
    return _masterKey;
  }

  // 2. Try key file
  const dir = dataDir || process.env.DATA_DIR || path.join(process.cwd(), "data");
  const keyPath = path.join(dir, "config", "master.key");

  if (fs.existsSync(keyPath)) {
    _masterKey = Buffer.from(fs.readFileSync(keyPath, "utf-8").trim(), "hex");
    if (_masterKey.length !== KEY_LENGTH) {
      throw new Error(`master.key file must contain ${KEY_LENGTH * 2} hex characters`);
    }
    return _masterKey;
  }

  // 3. Generate new key
  _masterKey = crypto.randomBytes(KEY_LENGTH);
  const configDir = path.dirname(keyPath);
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(keyPath, _masterKey.toString("hex"), { mode: 0o600 });
  console.log(`[crypto] Generated new master key at ${keyPath}`);

  return _masterKey;
}

/** Reset cached key (for testing) */
export function _resetMasterKey(): void {
  _masterKey = null;
}
