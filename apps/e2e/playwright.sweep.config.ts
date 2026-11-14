import { defineConfig } from "@playwright/test";
import { frozenClockEnv } from "./support/clock";
import { WEB_URL } from "./support/env";
import { webServers } from "./support/servers";

/**
 * Design sweep (E16 PR 13), a local tool and not a CI job: re-seeds each persona and writes
 * screenshots and DOM metrics to docs/design/e16-polish/after. One worker, because the sets
 * switch the single dev user between households. See README "Design sweep".
 */
export default defineConfig({
  testDir: "./sweep",
  testMatch: "sweep.spec.ts",
  outputDir: "./test-results-sweep",
  globalSetup: "./support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90 * 60_000,
  reporter: [["list"]],
  use: { baseURL: WEB_URL },
  projects: [{ name: "sweep" }],
  webServer: webServers(frozenClockEnv()),
});
