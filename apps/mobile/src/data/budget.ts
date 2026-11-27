/**
 * The saved budget (E12 S5b, plan 9.8b): `GET /budget-entries`, the same `/v1` route web's Home
 * reads, for the two-figure strip. The answer is parsed with a loose pick of the contract's own
 * `BudgetEntryListResponse` (older and newer backends, as S5's account reads): unknown fields are
 * ignored, and only what a row means nothing without is required. The engine reads the rest when
 * present (`budgetEntryFromRow`).
 */
import type { ApiClient } from "@flump/api-client";
import { BudgetEntryDto } from "@flump/api-contract";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "./ApiProvider";
import { queryKeys } from "./queryKeys";

/**
 * A budget row: its category, amount and whether it is income are needed; the share, the link and
 * the rest may be absent (rows from before those columns), and unknown fields are ignored.
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
  .required({ category: true, amount: true, isIncome: true })
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
