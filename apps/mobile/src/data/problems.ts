/**
 * What went wrong with a `/v1` call, in the few kinds a screen acts on. Screens never look inside a
 * `BackendError` themselves (O5 seam 2).
 *
 * `termsNotAccepted` (PR #939): the backend answers every authenticated route with 403
 * `terms_not_accepted` until the person agrees to the terms in force. The account check turns it
 * into the session's `termsRequired` state; a screen whose read gets it mid-session shows the same
 * screen (`TermsRequired`), which sends the person to the website to agree.
 */
import { BackendError } from "@flump/api-client";

export type ApiProblem =
  | "termsNotAccepted"
  | "notInvited"
  | "unauthorised"
  | "unavailable"
  | "other";

export const TERMS_NOT_ACCEPTED_CODE = "terms_not_accepted";

export function classifyApiError(error: unknown): ApiProblem {
  if (!(error instanceof BackendError)) return "other";
  if (error.kind === "forbidden" && error.code === TERMS_NOT_ACCEPTED_CODE) {
    return "termsNotAccepted";
  }
  if (error.kind === "not-invited") return "notInvited";
  if (error.kind === "unauthorised") return "unauthorised";
  if (error.kind === "unavailable" || error.kind === "server") return "unavailable";
  return "other";
}
