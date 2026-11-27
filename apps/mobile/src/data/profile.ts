/**
 * The profile's one read and its one write (E12 S9, plan 9.10), the same `/v1` routes web uses:
 * `GET /user-profile`, cached under `queryKeys.userProfile` (the check-in, Home, More and Settings
 * all read this one query), and `PATCH /user-profile`. The body is parsed with the contract's
 * strict `UpdateProfileRequest` before it is sent; `If-Match` carries the version last read, as
 * web's `useUserProfile` sends it, so a profile changed somewhere else is not overwritten (412).
 */
import { type ApiClient, BackendError } from "@flump/api-client";
import { etagFor, UpdateProfileRequest, UserProfileResponse } from "@flump/api-contract";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useApi } from "./ApiProvider";
import { queryKeys } from "./queryKeys";

/**
 * The profile fields the app reads, taken from the contract's own definitions, each allowed to be
 * absent, and other fields kept but ignored. Not the whole strict profile: a field added to or
 * dropped from the profile elsewhere (staging runs older than main) must not stop the app, as S2b's
 * account check reads no body for the same reason. An empty answer is a person with no profile yet.
 */
export const AppProfile = UserProfileResponse.pick({
  onboardingCompleted: true,
  checkInDay: true,
  netWorthCountsProperty: true,
  netWorthCountsStudentLoan: true,
  firstName: true,
  lastName: true,
  email: true,
  enabledPages: true,
  dashboardWidgets: true,
  updatedAt: true,
})
  .partial()
  .loose();
export type AppProfile = ReturnType<typeof AppProfile.parse>;

/** What a save may change: the contract's PATCH body. */
export type ProfileUpdate = UpdateProfileRequest;

function need(api: ApiClient | null): ApiClient {
  if (!api) throw new Error("No API client");
  return api;
}

/** `GET /user-profile`. Null when the backend answers with no profile (not set up yet). */
export async function fetchProfile(
  api: ApiClient | null,
  signal?: AbortSignal,
): Promise<AppProfile | null> {
  // A query's data cannot be undefined, so no body is null.
  return (
    (await need(api).request("/user-profile", { schema: AppProfile, allowEmpty: true, signal })) ??
    null
  );
}

/** Web's `versionEtag`: the `If-Match` for a version, or none when it is missing or not a date. */
function ifMatchFor(updatedAt: string | null | undefined): string | undefined {
  if (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt))) return undefined;
  return etagFor(updatedAt);
}

/** `PATCH /user-profile`. Throws before sending a body the contract refuses, or a BackendError. */
export async function patchProfile(
  api: ApiClient | null,
  update: ProfileUpdate,
  updatedAt: string | null | undefined,
): Promise<AppProfile> {
  const body = UpdateProfileRequest.parse(update);
  const ifMatch = ifMatchFor(updatedAt);
  return need(api).request("/user-profile", {
    method: "PATCH",
    body,
    schema: AppProfile,
    ...(ifMatch ? { ifMatch } : {}),
  });
}

/** The one profile query. `enabled: false` (restored offline) sends nothing. */
export function useProfile({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: ({ signal }) => fetchProfile(api, signal),
    enabled,
  });
}

/**
 * How a save ended: saved (the answer is in the query), conflict (changed somewhere else: nothing
 * saved, the profile read again) or failed (nothing changed).
 */
type SaveResult = "saved" | "conflict" | "failed";
export type SaveProfile = (update: ProfileUpdate) => Promise<SaveResult>;

const isConflict = (error: unknown) => error instanceof BackendError && error.status === 412;

/**
 * Saves profile fields, one save at a time and in order, so each sends the version the one before
 * it returned and two quick changes never read as a change made somewhere else (as web's queue).
 * The answer is written into the profile query, so every screen reading it follows at once.
 */
export function useSaveProfile(): SaveProfile {
  const api = useApi();
  const queryClient = useQueryClient();
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  return useCallback(
    (update: ProfileUpdate) => {
      const key = queryKeys.userProfile();
      const run = async (): Promise<SaveResult> => {
        const current = queryClient.getQueryData<AppProfile | null>(key);
        try {
          const saved = await patchProfile(api, update, current?.updatedAt);
          // Fields an older backend leaves out of its answer keep what was read.
          queryClient.setQueryData<AppProfile | null>(key, (previous) => ({
            ...(previous ?? {}),
            ...saved,
          }));
          return "saved";
        } catch (error) {
          if (!isConflict(error)) return "failed";
          // The saved profile is read again, so the control shows it and the next save sends it.
          await queryClient.invalidateQueries({ queryKey: key }).catch(() => undefined);
          return "conflict";
        }
      };
      const result = queue.current.then(run, run);
      queue.current = result.catch(() => undefined);
      return result;
    },
    [api, queryClient],
  );
}
