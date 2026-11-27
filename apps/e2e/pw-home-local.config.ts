import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "marketing-home.spec.ts",
  timeout: 60000,
  workers: 4,
  reporter: [["list"]],
});
