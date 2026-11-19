import { test } from "@playwright/test";

/** One minute of the backend's per-user and per-address limits, and a second to spare. */
const RATE_WINDOW_MS = 61_000;

/**
 * Waits out one minute of the backend's request limits (120 writes and 600 reads a minute per
 * user, 300 requests a minute per address) before a spec that seeds a persona or makes many calls.
 * The suite has one user, so the link specs run one after another inside the same minute windows,
 * and without a pause the later ones are refused with 429. The interaction suite does the same
 * after seeding (interaction/flows.ts). The limits themselves are unchanged. The test's own time
 * limit is raised by the wait, so the wait never counts against it.
 */
export async function waitOutRateWindow(): Promise<void> {
  test.setTimeout(test.info().timeout + RATE_WINDOW_MS);
  await new Promise((resolve) => setTimeout(resolve, RATE_WINDOW_MS));
}
