import { callBackend } from "@flump/api-client";
import { BetaModeResponse } from "@flump/api-contract";
import { apiConfig } from "~/config.server";

/** How long one answer is reused. Closing or opening the beta is a variable change and a restart. */
const TTL_MS = 60_000;
const TIMEOUT_MS = 3000;

let cached: { inviteOnly: boolean; at: number } | null = null;

/**
 * Whether the beta is invite-only, read from the backend's public `GET /app/beta` (one boolean).
 * The answer is kept for a minute so a page load costs no extra call. When the backend cannot be
 * reached the answer is "invite-only": the app then offers no sign-up and checks each signed-in
 * page load, which is the safe side. A failure is not kept, so the next request asks again.
 */
export async function isInviteOnly(now: number = Date.now()): Promise<boolean> {
  if (cached && now - cached.at < TTL_MS) return cached.inviteOnly;
  try {
    const { data } = await callBackend(
      { baseUrl: apiConfig.apiBaseUrl, fetch: (input, init) => fetch(input, init) },
      "/app/beta",
      { schema: BetaModeResponse, timeoutMs: TIMEOUT_MS },
    );
    cached = { inviteOnly: data.inviteOnly, at: now };
    return data.inviteOnly;
  } catch {
    return true;
  }
}

/** Test seam: forget the kept answer. */
export function resetBetaModeCache(): void {
  cached = null;
}
