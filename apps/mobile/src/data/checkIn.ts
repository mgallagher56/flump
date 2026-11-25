/**
 * The monthly check-in's reads and its one write (plan 9.6), the same `/v1` routes web uses:
 * `GET /accounts`, `GET /account-details`, `GET /user-profile` (the net worth choices and the
 * check-in day), `GET /snapshots/check-ins`, and `PUT /snapshots/:month`. Every answer is parsed
 * with its contract schema by `@flump/api-client`; the request body is parsed with the contract's
 * request schema before it is sent, so a body the backend would refuse never leaves the phone.
 */
import type { ApiClient } from "@flump/api-client";
import {
  AccountDetailListResponse,
  AccountListResponse,
  SnapshotCheckInsResponse,
  UpsertSnapshotRequest,
  UpsertSnapshotResponse,
  UserProfileResponse,
} from "@flump/api-contract";
import type { SnapshotPayload } from "@flump/finance-engine/check-in";
import { type QueryClient, useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useApi } from "./ApiProvider";
import { queryKeys } from "./queryKeys";

type Accounts = AccountListResponse;
type AccountDetails = AccountDetailListResponse;
type UserProfile = UserProfileResponse;
type CheckIns = SnapshotCheckInsResponse;

/** Thrown when there is no API client (a misconfigured build): reads as any load failure. */
class NoApiClientError extends Error {
  constructor() {
    super("No API client");
    this.name = "NoApiClientError";
  }
}

function need(api: ApiClient | null): ApiClient {
  if (!api) throw new NoApiClientError();
  return api;
}

export interface CheckInQueries {
  accounts: { data?: Accounts; error: unknown; isFetching: boolean };
  details: { data?: AccountDetails; error: unknown; isFetching: boolean };
  profile: { data?: UserProfile; error: unknown; isFetching: boolean };
  checkIns: { data?: CheckIns; error: unknown; isFetching: boolean };
  /** Fetches whatever failed again. */
  refetch(): void;
}

/** The four reads the check-in and its row need, in parallel and cached under one key each. */
export function useCheckInQueries(): CheckInQueries {
  const api = useApi();
  const [accounts, details, profile, checkIns] = useQueries({
    queries: [
      {
        queryKey: queryKeys.accounts(),
        // The history comes from /account-details, so the account list carries none.
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          need(api).request("/accounts", {
            schema: AccountListResponse,
            query: { details: "none" },
            signal,
          }),
      },
      {
        queryKey: queryKeys.accountDetails(),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          need(api).request("/account-details", { schema: AccountDetailListResponse, signal }),
      },
      {
        queryKey: queryKeys.userProfile(),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          need(api).request("/user-profile", { schema: UserProfileResponse, signal }),
      },
      {
        queryKey: queryKeys.checkIns(),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          need(api).request("/snapshots/check-ins", { schema: SnapshotCheckInsResponse, signal }),
      },
    ],
  });
  return {
    accounts,
    details,
    profile,
    checkIns,
    refetch: () => {
      for (const q of [accounts, details, profile, checkIns]) {
        if (q.isError) void q.refetch();
      }
    },
  };
}

/** `PUT /snapshots/:month` with an engine-built payload. Throws a BackendError on failure. */
export async function putSnapshot(api: ApiClient | null, month: string, payload: SnapshotPayload) {
  const body = UpsertSnapshotRequest.parse(payload);
  return need(api).request(`/snapshots/${encodeURIComponent(month)}`, {
    method: "PUT",
    body,
    schema: UpsertSnapshotResponse,
  });
}

/** After a check-in closes: the saved balances, history and check-in months are read again. */
function invalidateCheckIn(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.accountDetails() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.checkIns() }),
  ]).then(() => undefined);
}

/** Reads the check-in's data again when the screen using it closes (web's `takeDirty` refresh). */
export function useRefreshCheckInOnLeave(): void {
  const queryClient = useQueryClient();
  useEffect(() => () => void invalidateCheckIn(queryClient), [queryClient]);
}
