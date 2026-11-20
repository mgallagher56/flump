import { UserProfileResponse } from "@flump/api-contract";
import type { UserProfile } from "~/hooks/useUserProfile";
import { backendFetch } from "./backend-client.server";

/**
 * One profile read per incoming request, shared by the invite gate (middleware) and the root
 * loader. Keyed on the router context, which React Router creates per request, so nothing is
 * shared between requests. A failure is shared too: each caller decides what it means.
 */
const inFlight = new WeakMap<object, Promise<UserProfile>>();

export function loadRootProfile(
  context: object,
  accessToken: string,
  signal?: AbortSignal,
): Promise<UserProfile> {
  const existing = inFlight.get(context);
  if (existing) return existing;
  const promise = backendFetch("/user-profile", {
    accessToken,
    signal,
    schema: UserProfileResponse,
  });
  // The shared promise may be awaited later or not at all; never leave its rejection unhandled.
  promise.catch(() => undefined);
  inFlight.set(context, promise);
  return promise;
}
