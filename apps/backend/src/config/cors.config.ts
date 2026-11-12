export const DEV_CORS_ORIGINS: readonly string[] = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8082",
];

function assertHttpOrigin(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`CORS_ALLOWED_ORIGINS contains an invalid origin: "${value}"`);
  }
  const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
  if (!isHttp || parsed.origin !== value) {
    throw new Error(
      `CORS_ALLOWED_ORIGINS entries must be bare http(s) origins (e.g. https://app.example.com), got "${value}"`,
    );
  }
}

/**
 * Resolve the CORS allow-list. In production the list is mandatory and has no
 * localhost fallback; elsewhere the dev defaults apply when unset.
 */
export function resolveCorsOrigins(env: Record<string, string | undefined>): string[] {
  const origins = (env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  if (origins.length === 0) {
    if (env.NODE_ENV === "production") {
      throw new Error("CORS_ALLOWED_ORIGINS is required in production (comma-separated origins)");
    }
    return [...DEV_CORS_ORIGINS];
  }

  for (const origin of origins) assertHttpOrigin(origin);
  return origins;
}
