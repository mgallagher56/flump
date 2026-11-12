import type { BackendErrorKind } from "./backend-error.js";

/**
 * Generic, user-facing copy per failure kind. Copied verbatim from the web app's
 * `route-error.server.ts` so web and mobile say the same thing. Never carries backend text.
 */
export const ACTION_MESSAGE_BY_KIND: Record<BackendErrorKind, string> = {
  unavailable: "We couldn't reach the server. Please try again.",
  server: "Something went wrong on our side. Please try again.",
  "bad-response": "Something went wrong on our side. Please try again.",
  "not-found": "We couldn't find that. It may have been removed.",
  forbidden: "You don't have permission to do that.",
  "not-invited": "This account has not been invited to the Flump beta yet.",
  client: "We couldn't save that. Check the details and try again.",
  unauthorised: "Your session has ended. Please sign in again.",
};
