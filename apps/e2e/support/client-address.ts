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
 *
 * The chromium project runs its specs in parallel workers, and each worker is its own browser: a
 * second person on a second device. Sharing one address made two browsers count as one person, and
 * with every app page reading the whole financial picture (audit slice 3) the pair passed 300 calls
 * in a minute and the Dashboard was refused. So each chromium worker reports its own address too.
 */
export const PROJECT_CLIENT_ADDRESS = {
  chromium: "192.0.2.10",
  links: "192.0.2.30",
  "new-user": "192.0.2.20",
} as const;

export type SmokeProject = keyof typeof PROJECT_CLIENT_ADDRESS;

/** First octet-4 value of the per-worker chromium addresses: 192.0.2.100, .101 and so on. */
const CHROMIUM_WORKER_BASE = 100;
const MAX_WORKER_SLOTS = 150;

/**
 * The client address for a project. For chromium, `parallelIndex` (Playwright's
 * TEST_PARALLEL_INDEX, set in each worker process) picks the worker's own address; without one
 * (the main process, which opens no browser) the project address is used.
 */
export function clientAddressFor(project: SmokeProject, parallelIndex?: string): string {
  if (project !== "chromium" || parallelIndex === undefined || parallelIndex === "") {
    return PROJECT_CLIENT_ADDRESS[project];
  }
  const index = Number(parallelIndex);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_WORKER_SLOTS) {
    throw new Error(`TEST_PARALLEL_INDEX must be a whole number from 0 to ${MAX_WORKER_SLOTS - 1}`);
  }
  return `192.0.2.${CHROMIUM_WORKER_BASE + index}`;
}

/**
 * `extraHTTPHeaders` for a project's browser: its own client address. Playwright loads the config
 * again in every worker process, so this runs per worker and reads that worker's index.
 */
export function clientAddressHeaders(
  project: SmokeProject,
  parallelIndex: string | undefined = process.env.TEST_PARALLEL_INDEX,
): Record<string, string> {
  return { "x-forwarded-for": clientAddressFor(project, parallelIndex) };
}
