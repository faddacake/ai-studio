import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { encrypt, decrypt, _resetMasterKey } from "./index.js";

describe("encrypt/decrypt", () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aistudio-crypto-test-"));
    process.env.DATA_DIR = tmpDir;
    _resetMasterKey();
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.DATA_DIR;
    _resetMasterKey();
  });

  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "sk-replicate-abc123-secret-key";
    const encrypted = encrypt(plaintext, tmpDir);
    const decrypted = decrypt(encrypted, tmpDir);
    assert.equal(decrypted, plaintext);
  });

  it("produces different ciphertexts for same input (random IV + salt)", () => {
    const plaintext = "test-key";
    const a = encrypt(plaintext, tmpDir);
    const b = encrypt(plaintext, tmpDir);
    assert.notEqual(a.ciphertext, b.ciphertext);
    assert.notEqual(a.iv, b.iv);
  });

  it("fails to decrypt with tampered auth tag", () => {
    const encrypted = encrypt("secret", tmpDir);
    encrypted.authTag = "0".repeat(encrypted.authTag.length);
    assert.throws(() => decrypt(encrypted, tmpDir));
  });

  it("generates master key file on first use", () => {
    const keyPath = path.join(tmpDir, "config", "master.key");
    assert.ok(fs.existsSync(keyPath), "master.key should exist after encrypt");
  });
});
