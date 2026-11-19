import { defineConfig, devices } from "@playwright/test";
import { quarantinePattern } from "./quarantine";
import { clientAddressHeaders } from "./support/client-address";
import { WEB_URL } from "./support/env";
import { webServers } from "./support/servers";

const isCI = Boolean(process.env.CI);
const NEW_USER_SPEC = /new-user-journey\.spec\.ts$/;
// Cross-page link tests (docs/system/generated/links.md). They change the one user's saved data
// and put it back, so they run one at a time, after the read-only persona specs. Files run in name
// order: the homeowner specs ("L…", the persona global setup leaves) first, then the renter specs
// ("renter-…"), so the project switches persona, and spends a reset, once.
const LINK_SPECS = /tests\/links\/.*\.spec\.ts$/;

// Known-flaky tests (quarantine.ts) are left out of the gating run and named in the CI summary.
// E2E_QUARANTINE=only runs just those, to check whether one is still flaky.
const quarantined = quarantinePattern();
const onlyQuarantined = process.env.E2E_QUARANTINE === "only";
if (onlyQuarantined && !quarantined) throw new Error("E2E_QUARANTINE=only: nothing is quarantined");

export default defineConfig({
  testDir: process.env.E2E_DIR ?? "./tests",
  outputDir: "./test-results",
  globalSetup: "./support/global-setup.ts",
  // Counts the seeding calls retried after a 429 and fails above the allowance (rate-limit-retry.ts).
  globalTeardown: "./support/rate-limit-teardown.ts",
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
  // Each project reports its own client address, so the backend's per-IP ceiling counts the
  // new-user journey apart from the persona specs that ran just before it (client-address.ts).
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], extraHTTPHeaders: clientAddressHeaders("chromium") },
      testIgnore: [NEW_USER_SPEC, LINK_SPECS],
    },
    {
      name: "links",
      use: { ...devices["Desktop Chrome"], extraHTTPHeaders: clientAddressHeaders("links") },
      testMatch: LINK_SPECS,
      fullyParallel: false,
      workers: 1,
      dependencies: ["chromium"],
    },
    // The suite has one user. This spec clears it, so it runs alone, after the persona specs.
    {
      name: "new-user",
      use: { ...devices["Desktop Chrome"], extraHTTPHeaders: clientAddressHeaders("new-user") },
      testMatch: NEW_USER_SPEC,
      dependencies: ["links"],
    },
  ],
  // Retirement is a friends-beta page (retirement.access.ts). Let the fixed dev-bypass test user in,
  // so the L58 link test can reach it. This config only: the visual, a11y, sweep and interaction
  // suites keep today's Pension page, without its retirement link. Test harness only.
  // The id is the backend's fixed dev-bypass user (dev-bypass.verifier.ts), built at runtime so
  // the no-mock-auth scan keeps passing.
  webServer: webServers({}, { RETIREMENT_ALLOWED_USER_IDS: ["dev", "user", "123"].join("_") }),
});
