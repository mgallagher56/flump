/**
 * The monthly check-in's reads and its one write (plan 9.6), the same `/v1` routes web uses:
 * `GET /accounts`, `GET /account-details`, `GET /user-profile` (the net worth choices and the
 * check-in day), `GET /snapshots/check-ins`, and `PUT /snapshots/:month`. Every answer is parsed
 * with its contract schema by `@flump/api-client`; the request body is parsed with the contract's
 * request schema before it is sent, so a body the backend would refuse never leaves the phone.
 */
import type { ApiClient } from "@flump/api-client";
import {
  AccountDetailDto,
  AccountWithDetailsDto,
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

/**
 * The account fields Home and the check-in read (plan 9.8, older and newer backends): the
 * contract's own definitions, unknown fields ignored, and every field the screens can live without
 * allowed to be absent. Only a missing `id`, `type` or `balance` is out of step. The history comes
 * from /account-details, so `details` is not read here.
 */
const AppAccount = AccountWithDetailsDto.omit({ details: true })
  .partial()
  .required({ id: true, type: true, balance: true })
  .loose();
const AppAccountList = AppAccount.array();
/** A monthly row: which account, which month and its value are needed; the rest may be absent. */
const AppAccountDetail = AccountDetailDto.partial()
  .required({ accountId: true, year: true, month: true, value: true })
  .loose();
const AppAccountDetailList = AppAccountDetail.array();
/** The check-in months, unknown fields ignored. */
const AppCheckIns = SnapshotCheckInsResponse.loose();

type Accounts = ReturnType<typeof AppAccountList.parse>;
type AccountDetails = ReturnType<typeof AppAccountDetailList.parse>;
/**
 * The profile fields the check-in reads, taken from the contract's own definitions, each allowed to
 * be absent, and other fields ignored. Not the whole strict profile: a field added to or dropped
 * from the profile elsewhere (staging runs older than main) must not stop the check-in, as S2b's
 * account check reads no body for the same reason. An empty answer is a person with no profile yet.
 * Since S5b it also carries the facts Home's strip reads for a budget line linked to take-home pay
 * (`profileFactsFromProfile`), each optional too.
 */
const CheckInProfile = UserProfileResponse.pick({
  onboardingCompleted: true,
  checkInDay: true,
  netWorthCountsProperty: true,
  netWorthCountsStudentLoan: true,
  annualSalary: true,
  employmentType: true,
  taxRegion: true,
  studentLoanPlans: true,
  pensionPercent: true,
  isSalarySacrifice: true,
  monthlyTakeHome: true,
  housingStatus: true,
  monthlyHousingCost: true,
  propertyOwnershipShare: true,
})
  .partial()
  .loose();
type UserProfile = ReturnType<typeof CheckInProfile.parse>;
type CheckIns = ReturnType<typeof AppCheckIns.parse>;

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
  /** Null: the backend answered with no profile (a person who has not set up yet). */
  profile: { data?: UserProfile | null; error: unknown; isFetching: boolean };
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
            schema: AppAccountList,
            query: { details: "none" },
            signal,
          }),
      },
      {
        queryKey: queryKeys.accountDetails(),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          need(api).request("/account-details", { schema: AppAccountDetailList, signal }),
      },
      {
        queryKey: queryKeys.userProfile(),
        queryFn: async ({ signal }: { signal: AbortSignal }) =>
          // A query's data cannot be undefined, so no body is null.
          (await need(api).request("/user-profile", {
            schema: CheckInProfile,
            allowEmpty: true,
            signal,
          })) ?? null,
      },
      {
        queryKey: queryKeys.checkIns(),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          need(api).request("/snapshots/check-ins", { schema: AppCheckIns, signal }),
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
