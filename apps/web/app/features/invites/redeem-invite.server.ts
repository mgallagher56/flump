import { RedeemBetaInviteResponse } from "@flump/api-contract";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";

export type RedeemOutcome = "joined" | "unusable" | "busy";

/**
 * Redeems an invite as the signed-in person (`POST /beta/invites/redeem`, server-side only).
 * `unusable` covers used, cancelled, expired and unknown links alike; `busy` is the rate limit.
 * Any other failure is thrown for the caller's route error handling.
 */
export async function redeemInvite(
  accessToken: string,
  token: string,
  signal?: AbortSignal,
): Promise<RedeemOutcome> {
  try {
    await backendFetch("/beta/invites/redeem", {
      accessToken,
      method: "POST",
      body: { token },
      idempotencyKey: false,
      signal,
      schema: RedeemBetaInviteResponse,
    });
    return "joined";
  } catch (error) {
    if (error instanceof BackendError && error.status === 410) return "unusable";
    if (error instanceof BackendError && error.status === 429) return "busy";
    throw error;
  }
}
