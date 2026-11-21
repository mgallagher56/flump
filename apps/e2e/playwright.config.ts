import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { quarantinePattern } from "./quarantine";
import { clientAddressHeaders } from "./support/client-address";
import { WEB_URL } from "./support/env";
import { BACKEND_LOG } from "./support/read-budget";
import { webServers } from "./support/servers";

const isCI = Boolean(process.env.CI);
// The smoke suite (this config only) retries a seeding call once after a 429 within one minute's
// Retry-After (support/rate-limit-retry.ts). Set here so the runner and its workers both see it.
process.env.E2E_RATE_LIMIT_RETRY = "1";
mkdirSync(dirname(BACKEND_LOG), { recursive: true });
// The new-user project's specs: the journey (it clears the one user and sets it up again), then
// new-user-then-adds-accounts.spec.ts on the state the journey left. One worker, files in name
// order ("new-user-journey" sorts before "new-user-then-…"), so the journey always runs first.
const NEW_USER_SPEC = /new-user-[^/]*\.spec\.ts$/;
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
    // The suite has one user. The journey clears it, so the project runs alone, after the persona
    // and link specs, one file at a time in name order: the journey, then the spec that builds on it.
    {
      name: "new-user",
      use: { ...devices["Desktop Chrome"], extraHTTPHeaders: clientAddressHeaders("new-user") },
      testMatch: NEW_USER_SPEC,
      fullyParallel: false,
      workers: 1,
      dependencies: ["links"],
    },
  ],
  webServer: webServers(
    {},
    {},
    // A timestamped copy of the backend's output, for the read budget and its 429s.
    { backendLog: BACKEND_LOG },
  ),
});
