import { isProductionLike } from "../../auth/mcp-access";

type Env = Record<string, string | undefined>;

const DEV_WEB_ORIGIN = "http://localhost:5173";

/**
 * The web app origin for import review links (E17 re-plan PR D): `WEB_ORIGIN`, a bare http(s)
 * origin. Outside production it falls back to the Vite dev server; in a production-like process
 * with no valid value it is null and links are relative (see the boot warning).
 */
export function readWebOrigin(env: Env): string | null {
  const raw = env.WEB_ORIGIN?.trim().replace(/\/+$/, "");
  if (raw && /^https?:\/\/[^/\s?#]+$/i.test(raw)) return raw;
  return isProductionLike(env) ? null : DEV_WEB_ORIGIN;
}

export function webOriginBootWarning(env: Env): string | null {
  if (readWebOrigin(env) !== null || !isProductionLike(env)) return null;
  return "WEB_ORIGIN is not set to a bare http(s) origin: MCP import review links will be relative paths. Set it to the web app origin, such as https://app.example.com.";
}

/** Where the user reviews and commits an import batch in the web app. */
export function importReviewUrl(batchId: string, env: Env = process.env): string {
  const path = `/app/imports/${encodeURIComponent(batchId)}`;
  const origin = readWebOrigin(env);
  return origin ? `${origin}${path}` : path;
}
