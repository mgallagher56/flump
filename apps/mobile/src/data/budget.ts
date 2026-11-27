/**
 * The saved budget (E12 S5b, plan 9.8b; writes since S10, 9.10b): `GET /budget-entries`, the same
 * `/v1` route web reads, for Home's strip and the Budget tab. The answer is parsed with a loose pick
 * of the contract's own `BudgetEntryListResponse` (older and newer backends, as S5's account
 * reads): unknown fields are ignored, and only what a row means nothing without is required. The
 * engine reads the rest when present (`budgetEntryFromRow`).
 *
 * Writes (S10): `POST`, `PATCH` (with `If-Match`, as web's `updateEntry`) and `DELETE
 * /budget-entries/:id`. Each body is parsed with the contract's strict request schema before it is
 * sent, so a server-owned key (`isPrimaryIncome`, `isDefault`) or one with no column
 * (`contractEndDate`) can never go out. Each answer updates the one cached list.
 */
import { type ApiClient, BackendError } from "@flump/api-client";
import {
  BudgetEntryDto,
  CreateBudgetEntryRequest,
  DeleteBudgetEntryResponse,
  etagFor,
  UpdateBudgetEntryRequest,
  UserProfileResponse,
} from "@flump/api-contract";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
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
  // The row's version, sent back as `If-Match` on an edit (S10).
  updatedAt: true,
})
  .partial()
  .required({ category: true, amount: true, frequency: true, isIncome: true })
  .loose();
export const AppBudgetEntryList = AppBudgetEntry.array();

type BudgetEntries = ReturnType<typeof AppBudgetEntryList.parse>;
/** One saved budget row as the app holds it. */
export type AppBudgetEntry = BudgetEntries[number];

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

/**
 * The facts the Budget tab's figures are worked out from: the strip's ten, and the person's own
 * categories (`customBudgetCategories`), each optional, other fields ignored. From the same cached
 * profile answer, so there is still one request.
 */
const BudgetProfile = StripProfile.extend(
  UserProfileResponse.pick({ customBudgetCategories: true }).partial().shape,
).loose();
export type BudgetProfile = ReturnType<typeof BudgetProfile.parse>;

/** The Budget tab's profile facts from the cached profile answer, or null when they do not parse. */
export function parseBudgetProfile(profile: unknown): BudgetProfile | null {
  const parsed = BudgetProfile.safeParse(profile ?? {});
  return parsed.success ? parsed.data : null;
}

/** A new row: the contract's create body. */
type NewBudgetEntry = CreateBudgetEntryRequest;
/** What an edit may change: the contract's update body. */
type BudgetEntryUpdate = UpdateBudgetEntryRequest;

/** Web's `versionEtag`: the `If-Match` for a version, or none when it is missing or not a date. */
function ifMatchFor(updatedAt: string | null | undefined): string | undefined {
  if (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt))) return undefined;
  return etagFor(updatedAt);
}

/**
 * `POST /budget-entries`. Throws before sending a body the contract refuses, or a BackendError.
 * The caller names the Idempotency-Key: the client's default reads the global
 * `crypto.randomUUID`, which Hermes does not have, so without one the add never left the phone.
 */
async function createBudgetEntry(
  api: ApiClient | null,
  entry: NewBudgetEntry,
  idempotencyKey: string,
): Promise<AppBudgetEntry> {
  const body = CreateBudgetEntryRequest.parse(entry);
  return need(api).request("/budget-entries", {
    method: "POST",
    body,
    schema: AppBudgetEntry,
    idempotencyKey,
  });
}

/** `PATCH /budget-entries/:id` with the version last read as `If-Match`. */
async function updateBudgetEntry(
  api: ApiClient | null,
  id: string,
  update: BudgetEntryUpdate,
  updatedAt: string | null | undefined,
): Promise<AppBudgetEntry> {
  const body = UpdateBudgetEntryRequest.parse(update);
  const ifMatch = ifMatchFor(updatedAt);
  return need(api).request(`/budget-entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
    schema: AppBudgetEntry,
    ...(ifMatch ? { ifMatch } : {}),
  });
}

/** `DELETE /budget-entries/:id`. An empty answer is a delete too, as web allows. */
async function deleteBudgetEntry(api: ApiClient | null, id: string): Promise<void> {
  await need(api).request(`/budget-entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: DeleteBudgetEntryResponse.loose(),
    allowEmpty: true,
  });
}

/**
 * How a write ended: saved (the answer is in the cached list), conflict (the row changed somewhere
 * else: nothing saved, the list read again, 412) or failed (nothing changed).
 */
export type BudgetWriteResult = "saved" | "conflict" | "failed";

/** The one cached list every write updates. */
const key = queryKeys.budgetEntries();

const isConflict = (error: unknown) => error instanceof BackendError && error.status === 412;

export interface BudgetWrites {
  /** `idempotencyKey`: one per add the person makes, the same on its retries. */
  add(entry: NewBudgetEntry, idempotencyKey: string): Promise<BudgetWriteResult>;
  update(id: string, update: BudgetEntryUpdate): Promise<BudgetWriteResult>;
  remove(id: string): Promise<BudgetWriteResult>;
}

/**
 * The Budget tab's three writes. Each answer is written into the one cached list, so the figures,
 * Home's strip and the next screen follow at once. A 412 reads the list again, so the next try
 * sends the current version (web's `updateEntry`); the caller keeps what was typed.
 */
export function useBudgetWrites(): BudgetWrites {
  const api = useApi();
  const queryClient = useQueryClient();
  const setRows = useCallback(
    (change: (rows: BudgetEntries) => BudgetEntries) =>
      queryClient.setQueryData<BudgetEntries>(key, (rows) => change(rows ?? [])),
    [queryClient],
  );
  const add = useCallback(
    async (entry: NewBudgetEntry, idempotencyKey: string): Promise<BudgetWriteResult> => {
      try {
        const created = await createBudgetEntry(api, entry, idempotencyKey);
        setRows((rows) => [...rows, created]);
        return "saved";
      } catch {
        return "failed";
      }
    },
    [api, setRows],
  );
  const update = useCallback(
    async (id: string, change: BudgetEntryUpdate): Promise<BudgetWriteResult> => {
      const current = queryClient.getQueryData<BudgetEntries>(key)?.find((row) => row.id === id);
      try {
        const saved = await updateBudgetEntry(api, id, change, current?.updatedAt);
        setRows((rows) => rows.map((row) => (row.id === id ? saved : row)));
        return "saved";
      } catch (error) {
        if (!isConflict(error)) return "failed";
        await queryClient.invalidateQueries({ queryKey: key }).catch(() => undefined);
        return "conflict";
      }
    },
    [api, queryClient, setRows],
  );
  const remove = useCallback(
    async (id: string): Promise<BudgetWriteResult> => {
      try {
        await deleteBudgetEntry(api, id);
      } catch {
        // The row stays: the server still has it.
        return "failed";
      }
      setRows((rows) => rows.filter((row) => row.id !== id));
      return "saved";
    },
    [api, setRows],
  );
  return { add, update, remove };
}
