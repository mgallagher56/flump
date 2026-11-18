import { defineConfig } from "@playwright/test";
import { AUTH_STATE } from "./support/auth";
import { frozenClockEnv } from "./support/clock";
import { WEB_URL } from "./support/env";
import { webServers } from "./support/servers";

const isCI = Boolean(process.env.CI);

/**
 * Interaction cost (E38 S0): drives the seven core flows as a mouse user at 1280, a touch user at
 * 375 and a keyboard-only user at 1280, counting clicks or taps, keystrokes, Tab hops and
 * transitions, and compares them with docs/audit/interaction-cost/baseline.json. Warn-only
 * (ED1 option (a)). One worker, in file order: the flows share the single dev user, and
 * onboarding (which clears it) runs last. See README "Interaction cost".
 */
export default defineConfig({
  testDir: "./interaction",
  outputDir: "./test-results-interaction",
  globalSetup: "./interaction/global-setup.ts",
  globalTeardown: "./interaction/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: 0,
  workers: 1,
  // The first flow of a mode may wait a minute after re-seeding (flows.ts, freshHomeowner).
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report-interaction" }]]
    : [["list"]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
    locale: "en-GB",
    timezoneId: "Europe/London",
  },
  projects: [
    // The counting fixture on a page of its own, worked out by hand. Needs no app.
    { name: "counter", testMatch: "counter.spec.ts" },
    {
      name: "flows",
      testMatch: "flows.spec.ts",
      use: { storageState: AUTH_STATE },
      dependencies: ["counter"],
    },
  ],
  webServer: webServers(frozenClockEnv()),
});
