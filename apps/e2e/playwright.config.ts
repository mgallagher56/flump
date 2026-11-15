import { defineConfig, devices } from "@playwright/test";
import { quarantinePattern } from "./quarantine";
import { WEB_URL } from "./support/env";
import { webServers } from "./support/servers";

const isCI = Boolean(process.env.CI);
const NEW_USER_SPEC = /new-user-journey\.spec\.ts$/;

// Known-flaky tests (quarantine.ts) are left out of the gating run and named in the CI summary.
// E2E_QUARANTINE=only runs just those, to check whether one is still flaky.
const quarantined = quarantinePattern();
const onlyQuarantined = process.env.E2E_QUARANTINE === "only";
if (onlyQuarantined && !quarantined) throw new Error("E2E_QUARANTINE=only: nothing is quarantined");

export default defineConfig({
  testDir: process.env.E2E_DIR ?? "./tests",
  outputDir: "./test-results",
  globalSetup: "./support/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries (finding L10): a pass on retry hides a flaky spec. A spec that cannot be fixed
  // straight away goes in quarantine.ts with a reason, never behind a retry.
  retries: 0,
  grep: onlyQuarantined ? quarantined : undefined,
  grepInvert: onlyQuarantined ? undefined : quarantined,
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
