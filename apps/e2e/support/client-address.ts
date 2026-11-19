/**
 * The address each smoke project's browser reports to the web server, as the Railway edge does in
 * production: the last `X-Forwarded-For` entry, which the web server trusts (`trust proxy` 1) and
 * signs for the backend (apps/web/app/services/client-ip.server.ts, BE-07 M9).
 *
 * The backend's per-IP ceiling is 300 requests a minute (IP_RATE_LIMIT). Without a signed address
 * every request in the suite counts against the web server's own address, so the new-user journey
 * shared one bucket with every persona spec that ran in the same minute and its first budget entry
 * was refused with 429. Each project stands for a different person on a different device, so each
 * gets its own address, from the documentation range (RFC 5737) so it is never a real one.
 */
export const PROJECT_CLIENT_ADDRESS = {
  chromium: "192.0.2.10",
  "new-user": "192.0.2.20",
} as const;

export type SmokeProject = keyof typeof PROJECT_CLIENT_ADDRESS;

/** `extraHTTPHeaders` for a project's browser: its own client address. */
export function clientAddressHeaders(project: SmokeProject): Record<string, string> {
  return { "x-forwarded-for": PROJECT_CLIENT_ADDRESS[project] };
}
