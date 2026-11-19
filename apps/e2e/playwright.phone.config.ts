import { defineConfig } from "@playwright/test";
import { frozenClockEnv } from "./support/clock";
import { WEB_URL } from "./support/env";
import { webServers } from "./support/servers";

/**
 * Phone audit sweep (docs/audit/phone-audit-2026-11), a local tool and not a CI job: drives each
 * journey at phone sizes with touch emulation and writes screenshots and measured checks OUTSIDE
 * the repository (PHONE_OUT). One worker, because the sets switch the single dev user between
 * households. See README "Phone audit sweep".
 */
export default defineConfig({
  testDir: "./sweep",
  testMatch: "phone.spec.ts",
  outputDir: "./test-results-phone",
  globalSetup: "./support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 150 * 60_000,
  reporter: [["list"]],
  use: { baseURL: WEB_URL },
  projects: [{ name: "sweep" }],
  webServer: webServers(frozenClockEnv()),
});
