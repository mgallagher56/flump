import { defineConfig, devices } from "@playwright/test";
import {
  BACKEND_PORT,
  BACKEND_URL,
  MARKETING_PORT,
  MARKETING_URL,
  resolveDatabaseUrl,
  WEB_PORT,
  WEB_URL,
} from "./support/env";

const isCI = Boolean(process.env.CI);
const databaseUrl = resolveDatabaseUrl();

// The web server runs in NODE_ENV=development on purpose: the test-only cookie session
// (E2E_DEV_SESSION) is refused everywhere else. The code is the production build output.
const authEnv = {
  AUTH_DEV_BYPASS: "true",
  NODE_ENV: "development",
  WORKOS_API_KEY: "",
  RAILWAY_ENVIRONMENT: "",
};

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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      name: "backend",
      cwd: "../backend",
      command: "bun run migration:run && bun dist/main.js",
      url: `${BACKEND_URL}/health/ready`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        ...authEnv,
        PORT: String(BACKEND_PORT),
        DATABASE_URL: databaseUrl,
        DB_SSL: "false",
        CORS_ALLOWED_ORIGINS: WEB_URL,
        FRONTEND_URL: WEB_URL,
      },
    },
    {
      name: "web",
      cwd: "../web",
      command: "bun run start",
      url: `${WEB_URL}/healthz`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        ...authEnv,
        E2E_DEV_SESSION: "true",
        PORT: String(WEB_PORT),
        VITE_API_URL: BACKEND_URL,
        VITE_MARKETING_URL: MARKETING_URL,
      },
    },
    {
      name: "marketing",
      cwd: "../marketing",
      command: "bun run start",
      url: MARKETING_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: { PORT: String(MARKETING_PORT) },
    },
  ],
});
