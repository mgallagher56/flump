import { defineConfig, devices } from "@playwright/test";
import { frozenClockEnv } from "./support/clock";
import { WEB_URL } from "./support/env";
import { webServers } from "./support/servers";

const isCI = Boolean(process.env.CI);

/** Viewport widths from the E15 sign-off: phone and desktop. Height only sets the first fold. */
const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 900 };

const shared = {
  ...devices["Desktop Chrome"],
  deviceScaleFactor: 1,
  locale: "en-GB",
  timezoneId: "Europe/London",
  reducedMotion: "reduce" as const,
};

/**
 * Visual regression guard (E15 Phase 8). Full-page screenshots of every main screen at two
 * widths and two themes, plus cheap layout assertions. Baselines are Linux-only: they are
 * generated in CI in the Playwright image (see README "Visual regression").
 */
export default defineConfig({
  testDir: "./visual",
  outputDir: "./test-results-visual",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}-{projectName}{ext}",
  globalSetup: "./support/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries: a flaky shot should show up as a failure, not hide behind a pass on retry.
  retries: 0,
  workers: isCI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // An absolute pixel budget, not a ratio: a black 32 px logo is a tiny share of a
      // full-page shot and would slip under any percentage worth having.
      maxDiffPixels: 100,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  reporter: isCI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report-visual" }]]
    : [["list"]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "375-light", use: { ...shared, viewport: MOBILE, colorScheme: "light" } },
    { name: "375-dark", use: { ...shared, viewport: MOBILE, colorScheme: "dark" } },
    { name: "1280-light", use: { ...shared, viewport: DESKTOP, colorScheme: "light" } },
    { name: "1280-dark", use: { ...shared, viewport: DESKTOP, colorScheme: "dark" } },
  ],
  webServer: webServers(frozenClockEnv()),
});
