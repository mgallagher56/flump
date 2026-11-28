import { RedeemBetaInviteResponse } from "@flump/api-contract";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";

export type RedeemOutcome = "joined" | "already-member" | "unusable" | "busy";

/**
 * Redeems an invite as the signed-in person (`POST /beta/invites/redeem`, server-side only).
 * `already-member` means the person already had access and the link was left unused (it still
 * works for someone else). `unusable` covers used, cancelled, expired and unknown links alike;
 * `busy` is the rate limit.
 * Any other failure is thrown for the caller's route error handling.
 */
export async function redeemInvite(
  accessToken: string,
  token: string,
  signal?: AbortSignal,
): Promise<RedeemOutcome> {
  try {
    const { status } = await backendFetch("/beta/invites/redeem", {
      accessToken,
      method: "POST",
      body: { token },
      idempotencyKey: false,
      signal,
      schema: RedeemBetaInviteResponse,
    });
    return status;
  } catch (error) {
    // Only the invite's own 410: an erased account's 410 (account_deleted) is the caller's to handle.
    if (error instanceof BackendError && error.status === 410 && error.code === "invite_unusable") {
      return "unusable";
    }
    if (error instanceof BackendError && error.status === 429) return "busy";
    throw error;
  }
}
