/**
 * What went wrong with a `/v1` call, in the few kinds a screen acts on. Screens never look inside a
 * `BackendError` themselves (O5 seam 2).
 *
 * `termsNotAccepted` is a seam for PR #939 (terms acceptance at sign-up, not merged when S3 was
 * built): the backend will answer every authenticated route with 403 `terms_not_accepted` until the
 * person agrees on the website. The kind is classified now so the screen that sends them to the
 * website plugs in here; until then screens treat it as any other load failure.
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
