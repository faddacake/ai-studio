/**
 * Shared constants between global-setup.ts and E2E test files.
 * Kept in a separate file to avoid importing playwright.e2e.config.ts
 * (which registers the webServer config) inside test files.
 */

/** Isolated SQLite data directory for E2E runs — matches playwright.e2e.config.ts. */
export const E2E_DATA_DIR = "/tmp/aistudio-e2e";

/** Path to the JSON fixture written by global-setup and read by test files. */
export const SEED_FILE = `${E2E_DATA_DIR}/e2e-seed.json`;
