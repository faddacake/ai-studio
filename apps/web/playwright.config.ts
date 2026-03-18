import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./a11y",
  testMatch: "**/*.pw.ts",
  use: {
    ...devices["Desktop Chrome"],
  },
  // No webServer needed — tests load local file:// fixtures
});
