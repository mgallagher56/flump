import { defineConfig } from "@playwright/test";
import { A11Y_PROJECTS } from "./a11y/projects";
import { frozenClockEnv } from "./support/clock";
import { WEB_URL } from "./support/env";
import { webServers } from "./support/servers";

const isCI = Boolean(process.env.CI);

/**
 * Page-level accessibility gate (UX assessment checks K2 to K5 and K19). Every route in
 * visual/routes.ts runs axe (375 and 1280, light and dark, and forced colours), a keyboard focus
 * walk, a 320 px reflow check and the language tag. Known failures live in a11y/baseline.json:
 * the run fails only on something new or worse. See README "Accessibility gate".
 */
export default defineConfig({
  testDir: "./a11y",
  testMatch: "**/*.spec.ts",
  outputDir: "./test-results-a11y",
  globalSetup: "./a11y/global-setup.ts",
  globalTeardown: "./a11y/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 2 : undefined,
  // The long pages (self assessment) take about 45 s locally for axe plus the focus walk.
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report-a11y" }]]
    : [["list"]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
  },
  projects: A11Y_PROJECTS.map(({ name, use }) => ({ name, use })),
  webServer: webServers(frozenClockEnv()),
});
