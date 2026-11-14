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

/**
 * The built backend, web app and marketing site, shared by the smoke and visual configs.
 * `extraEnv` is added to every server (the visual suite passes its frozen clock).
 */
export function webServers(
  extraEnv: Record<string, string> = {},
): NonNullable<PlaywrightTestConfig["webServer"]> {
  const databaseUrl = resolveDatabaseUrl();
  return [
    {
      name: "backend",
      cwd: "../backend",
      command: "bun run migration:run && bun dist/main.js",
      url: `${BACKEND_URL}/health/ready`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        ...authEnv,
        ...extraEnv,
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
