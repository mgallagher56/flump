/** Matches the backend default port in apps/backend/src/main.ts. */
const DEV_API_BASE_URL = "http://localhost:4000";

/**
 * Resolves the one backend base URL for the web server.
 * - VITE_API_URL is trimmed; when set it must be an http or https URL.
 * - Trailing slashes are stripped.
 * - Unset: an error in production, otherwise the local backend default.
 */
export function loadApiConfig(env: Record<string, string | undefined>): { apiBaseUrl: string } {
  const raw = env.VITE_API_URL?.trim();
  if (!raw) {
    if (env.NODE_ENV === "production") {
      throw new Error("VITE_API_URL must be set in production");
    }
    return { apiBaseUrl: DEV_API_BASE_URL };
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("VITE_API_URL must be a valid http or https URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("VITE_API_URL must be a valid http or https URL");
  }
  return { apiBaseUrl: raw.replace(/\/+$/, "") };
}

// Fail at server start (same pattern as utils/auth.server.ts), not on the first request.
export const apiConfig = loadApiConfig(process.env);
