import { randomBytes } from "node:crypto";
import type { PlaywrightTestConfig } from "@playwright/test";
import {
  BACKEND_PORT,
  BACKEND_URL,
  MARKETING_PORT,
  MARKETING_URL,
  resolveDatabaseUrl,
  WEB_PORT,
  WEB_URL,
} from "./env";

const isCI = Boolean(process.env.CI);

// The web server runs in NODE_ENV=development on purpose: the test-only cookie session
// (E2E_DEV_SESSION) is refused everywhere else. The code is the production build output.
const authEnv = {
  AUTH_DEV_BYPASS: "true",
  NODE_ENV: "development",
  WORKOS_API_KEY: "",
  RAILWAY_ENVIRONMENT: "",
};

// Production requires this key on both services (PRODUCTION_REQUIRED, requiredEnv.ts): with it
// the backend keys its per-IP ceiling on each browser's address rather than on the web server's,
// so one project's traffic never uses up another's (support/client-address.ts). Made per run.
const clientIpEnv = { WEB_CLIENT_IP_HMAC_KEY: randomBytes(32).toString("hex") };

/**
 * The built backend, web app and marketing site, shared by the smoke and visual configs.
 * `extraEnv` is added to every server (the visual suite passes its frozen clock).
 * `backendEnv` is added to the backend only: the main config uses it to let the test user into
 * the friends-beta retirement page, which the visual, a11y, sweep and interaction suites must not see.
 */
export function webServers(
  extraEnv: Record<string, string> = {},
  backendEnv: Record<string, string> = {},
  options: { backendLog?: string } = {},
): NonNullable<PlaywrightTestConfig["webServer"]> {
  const databaseUrl = resolveDatabaseUrl();
  return [
    {
      name: "backend",
      cwd: "../backend",
      // The smoke config keeps a timestamped copy of the backend's output (its access log and any
      // 429), so the run can report its request rate and refusals (support/read-budget.ts).
      command: options.backendLog
        ? `bun run migration:run && bun dist/main.js 2>&1 | bun ../e2e/support/stamp-log.ts ${JSON.stringify(options.backendLog)}`
        : "bun run migration:run && bun dist/main.js",
      url: `${BACKEND_URL}/health/ready`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        ...authEnv,
        ...clientIpEnv,
        ...extraEnv,
        PORT: String(BACKEND_PORT),
        DATABASE_URL: databaseUrl,
        DB_SSL: "false",
        CORS_ALLOWED_ORIGINS: WEB_URL,
        FRONTEND_URL: WEB_URL,
        ...backendEnv,
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
        ...clientIpEnv,
        ...extraEnv,
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
      env: { ...extraEnv, PORT: String(MARKETING_PORT) },
    },
  ];
}
