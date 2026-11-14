import { defineConfig, devices } from "@playwright/test";
import { WEB_URL } from "./support/env";
import { webServers } from "./support/servers";

const isCI = Boolean(process.env.CI);
const NEW_USER_SPEC = /new-user-journey\.spec\.ts$/;

export default defineConfig({
  testDir: process.env.E2E_DIR ?? "./tests",
  outputDir: "./test-results",
  globalSetup: "./support/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: NEW_USER_SPEC },
    // The suite has one user. This spec clears it, so it runs alone, after the persona specs.
    {
      name: "new-user",
      use: { ...devices["Desktop Chrome"] },
      testMatch: NEW_USER_SPEC,
      dependencies: ["chromium"],
    },
  ],
  webServer: webServers(),
});
