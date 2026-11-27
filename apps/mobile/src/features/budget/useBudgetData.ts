/**
 * What the Budget tab shows (E12 S10, plan 9.10b), as one state: loading, not set up, an error
 * with the reason and a way to try again (a failed read is never "No budget yet"), or ready with
 * the page. It reads the check-in's queries (accounts, details, profile) and the saved budget, each
 * once, and every figure, rank and rule comes from the engine's `selectBudgetPageFromRows`, which
 * web's Budget page calls the parts of too: the app adds, subtracts and compares no money.
 */
import { selectBudgetPageFromRows } from "@flump/finance-engine/budget";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  type AppBudgetEntry,
  type BudgetProfile,
  parseBudgetProfile,
  useBudgetEntriesQuery,
} from "../../data/budget";
import { useCheckInQueries } from "../../data/checkIn";
import { type ApiProblem, classifyApiError } from "../../data/problems";
import { queryKeys } from "../../data/queryKeys";
import { useCheckInData } from "../check-in/useCheckInData";

/** The page the engine builds from the rows, as `selectBudgetPageFromRows` returns it. */
export type BudgetPageState = ReturnType<typeof selectBudgetPageFromRows>;
/** One entry the page lists: a saved row, or a linked line the engine made. */
export type BudgetPageRow = BudgetPageState["rows"][number];

export type BudgetDataState =
  | { status: "loading" }
  | { status: "notSetUp" }
  | { status: "error"; problem: ApiProblem; retry: () => void }
  | {
      status: "ready";
      page: BudgetPageState;
      /** The saved rows as the API sent them, by id: the version an edit sends, and who owns it. */
      saved: ReadonlyMap<string, AppBudgetEntry>;
      /** How the person pays for housing, for the housing row's tenure and link. */
      housingStatus: string | null;
      /** The person's own categories, for the editor's sections and the category choice. */
      customCategories: readonly string[];
    };

export function useBudgetData(now: () => Date = () => new Date()): BudgetDataState {
  const checkIn = useCheckInData(now);
  const { accounts, details, profile } = useCheckInQueries();
  const budget = useBudgetEntriesQuery();
  // The date the take-home reads its tax year from, once per screen, as Home does.
  const [today] = useState(now);
  const queryClient = useQueryClient();
  const a = accounts.data;
  const d = details.data;
  const p = profile.data;
  const b = budget.data;
  const ready = checkIn.status === "ready";
  const facts = useMemo((): BudgetProfile | null | undefined => {
    if (!ready) return undefined;
    return parseBudgetProfile(p);
  }, [ready, p]);
  const page = useMemo(() => {
    if (!facts || !b) return null;
    return selectBudgetPageFromRows({
      accounts: a,
      details: d,
      budgetEntries: b,
      profile: facts,
      today,
    });
  }, [facts, a, d, b, today]);
  const saved = useMemo(
    () => new Map((b ?? []).flatMap((row) => (row.id ? [[row.id, row] as const] : []))),
    [b],
  );

  // Not set up wins: the set-up screen shows whatever the budget read did.
  if (checkIn.status === "notSetUp") return checkIn;
  // One Try again reads again whatever failed, the check-in's reads and the budget alike.
  const retry = () => {
    if (checkIn.status === "error") checkIn.retry();
    if (budget.error) void budget.refetch();
  };
  if (checkIn.status === "error") return { ...checkIn, retry };
  // A failed budget read is an error, never "No budget yet"; a refetch that fails keeps the page.
  if (budget.error && b === undefined && !budget.isFetching) {
    return { status: "error", problem: classifyApiError(budget.error), retry };
  }
  if (facts === null) {
    // The profile's budget facts hold a value this version cannot read (a newer backend's).
    const retryProfile = () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.userProfile() });
    return { status: "error", problem: "outOfStep", retry: retryProfile };
  }
  if (!page || !facts) return { status: "loading" };
  return {
    status: "ready",
    page,
    saved,
    housingStatus: typeof facts.housingStatus === "string" ? facts.housingStatus : null,
    customCategories: (facts.customBudgetCategories ?? []).filter(
      (c): c is string => typeof c === "string",
    ),
  };
}
