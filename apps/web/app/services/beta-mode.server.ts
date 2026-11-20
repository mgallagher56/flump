import { callBackend } from "@flump/api-client";
import { BetaModeResponse } from "@flump/api-contract";
import { apiConfig } from "~/config.server";

/** How long one answer is reused. Closing or opening the beta is a variable change and a restart. */
const TTL_MS = 60_000;
/** How long a failed read is reused, so a backend outage does not add a timeout to every page. */
const FAILURE_TTL_MS = 10_000;
const TIMEOUT_MS = 3000;

let cached: { inviteOnly: boolean; until: number } | null = null;
let inFlight: Promise<boolean> | null = null;

async function read(now: number): Promise<boolean> {
  try {
    const { data } = await callBackend(
      { baseUrl: apiConfig.apiBaseUrl, fetch: (input, init) => fetch(input, init) },
      "/app/beta",
      { schema: BetaModeResponse, timeoutMs: TIMEOUT_MS },
    );
    cached = { inviteOnly: data.inviteOnly, until: now + TTL_MS };
    return data.inviteOnly;
  } catch {
    // Fail closed: no "Sign up", and signed-in page loads are checked.
    cached = { inviteOnly: true, until: now + FAILURE_TTL_MS };
    return true;
  }
}

/**
 * Whether the beta is invite-only, read from the backend's public `GET /app/beta` (one boolean).
 * The answer is kept for a minute and concurrent callers share one read, so a page load costs no
 * extra call. When the backend cannot be reached the answer is "invite-only" for ten seconds: the
 * app then offers no sign-up and checks each signed-in page load, which is the safe side.
 */
export function isInviteOnly(now: number = Date.now()): Promise<boolean> {
  if (cached && now < cached.until) return Promise.resolve(cached.inviteOnly);
  if (!inFlight) {
    inFlight = read(now).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Test seam: forget the kept answer. */
export function resetBetaModeCache(): void {
  cached = null;
  inFlight = null;
}
