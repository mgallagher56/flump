/**
 * The saved budget (E12 S5b, plan 9.8b): `GET /budget-entries`, the same `/v1` route web's Home
 * reads, for the two-figure strip. The answer is parsed with a loose pick of the contract's own
 * `BudgetEntryListResponse` (older and newer backends, as S5's account reads): unknown fields are
 * ignored, and only what a row means nothing without is required. The engine reads the rest when
 * present (`budgetEntryFromRow`).
 */
import type { ApiClient } from "@flump/api-client";
import { BudgetEntryDto, UserProfileResponse } from "@flump/api-contract";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "./ApiProvider";
import { queryKeys } from "./queryKeys";

/**
 * A budget row: its category, amount, frequency and whether it is income are needed, since the
 * engine would read a missing one as a different figure (no frequency as monthly). The share and
 * the link may be absent: the contract reads rows from before those columns as sole and unlinked,
 * as the engine does. Unknown fields are ignored.
 */
const AppBudgetEntry = BudgetEntryDto.pick({
  id: true,
  category: true,
  name: true,
  amount: true,
  frequency: true,
  isIncome: true,
  isEssential: true,
  ownership: true,
  sharePercent: true,
  linkKind: true,
  linkAccountId: true,
})
  .partial()
  .required({ category: true, amount: true, frequency: true, isIncome: true })
  .loose();
const AppBudgetEntryList = AppBudgetEntry.array();

export type BudgetEntries = ReturnType<typeof AppBudgetEntryList.parse>;

function need(api: ApiClient | null): ApiClient {
  if (!api) throw new Error("No API client");
  return api;
}

export interface BudgetEntriesQuery {
  data?: BudgetEntries;
  error: unknown;
  isFetching: boolean;
  refetch(): unknown;
}

/** The saved budget rows, cached under their one key. */
export function useBudgetEntriesQuery(): BudgetEntriesQuery {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.budgetEntries(),
    queryFn: ({ signal }) =>
      need(api).request("/budget-entries", { schema: AppBudgetEntryList, signal }),
  });
}

/**
 * The profile facts the strip's take-home line is worked out from (`profileFactsFromProfile`),
 * each optional, other fields ignored. Parsed from the check-in's cached profile answer, so there
 * is still one request; kept apart from the check-in's own pick, so a value only these facts hold
 * (a region a newer backend adds) puts only the strip out of step.
 */
const StripProfile = UserProfileResponse.pick({
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
export type StripProfile = ReturnType<typeof StripProfile.parse>;

/** The strip's profile facts from the cached profile answer, or null when they do not parse. */
export function parseStripProfile(profile: unknown): StripProfile | null {
  const parsed = StripProfile.safeParse(profile ?? {});
  return parsed.success ? parsed.data : null;
}
