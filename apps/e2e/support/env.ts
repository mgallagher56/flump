/**
 * Ports and URLs for the three apps the suite starts. They are deliberately not the dev-server
 * defaults (4000, 5173, 3001) so a running `bun run dev` never collides with, or gets pointed
 * at, the test database.
 */
export const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? 4100);
export const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
export const MARKETING_PORT = Number(process.env.E2E_MARKETING_PORT ?? 3101);

export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const MARKETING_URL = `http://localhost:${MARKETING_PORT}`;

const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/flump_e2e";

/**
 * The suite writes data for the dev-bypass user, so it only ever runs against a database whose
 * name says it is for e2e. Refuses anything else (mirrors the backend's assertSafeTestDatabase).
 */
export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.E2E_DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!/(^|[^a-z0-9])e2e([^a-z0-9]|$)/i.test(name)) {
    throw new Error(
      "E2E_DATABASE_URL must point at a database whose name contains the word e2e (for example flump_e2e)",
    );
  }
  return url;
}
