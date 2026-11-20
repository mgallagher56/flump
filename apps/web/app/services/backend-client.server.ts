import {
  BackendError,
  type ContractSchema,
  callBackend,
  kindFromStatus,
  type QueryValue,
  type TransportConfig,
  versionedPath,
} from "@flump/api-client";
import {
  AccountListResponse,
  BankConnectionListResponse,
  BudgetEntryListResponse,
  SnapshotCheckInsResponse,
  TaxRecordListResponse,
  UserProfileResponse,
} from "@flump/api-contract";
import {
  type FinancialPicture,
  type LoadedFinancialPicture,
  loadFinancialPicture,
  type PictureRowSource,
} from "@flump/finance-engine";
import type { LoaderFunctionArgs } from "react-router";
import { apiConfig } from "~/config.server";
import { getRequestId, withRequestIdHeader } from "~/security/request-id.server";
import { getAuthSession } from "~/utils/auth.server";
import { withClientIpHeaders } from "./client-ip.server";
import { throwRouteError } from "./route-error.server";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface BackendFetchBase {
  accessToken: string;
  method?: HttpMethod;
  body?: unknown;
  /** Caller cancellation, for example the loader's request.signal. */
  signal?: AbortSignal;
  /** Per-attempt timeout in milliseconds. Defaults to 8000. */
  timeoutMs?: number;
  /** Extra attempts after the first. Defaults to 1 for GET and 0 for everything else. */
  retries?: number;
  /** Appended to the path; `null` and `undefined` values are left out. */
  query?: Record<string, QueryValue>;
  /** `Idempotency-Key` for a POST: generated once per call (and reused by its retries) by default. */
  idempotencyKey?: string | false;
  /** Sent as `If-Match` on a conditional update. */
  ifMatch?: string;
}

/** The 2xx body must match `schema`, the route's contract `*Response`. */
export interface BackendFetchSchemaOptions<T> extends BackendFetchBase {
  schema: ContractSchema<T>;
  allowEmpty?: false;
}
/** As above, but an empty body resolves `undefined`. */
export interface BackendFetchMaybeEmptyOptions<T> extends BackendFetchBase {
  schema: ContractSchema<T>;
  allowEmpty: true;
}
/** A route with no response body. */
export interface BackendFetchEmptyOptions extends BackendFetchBase {
  schema: null;
  allowEmpty: true;
}
export type BackendFetchOptions<T> =
  | BackendFetchSchemaOptions<T>
  | BackendFetchMaybeEmptyOptions<T>
  | BackendFetchEmptyOptions;

const DEFAULT_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 250;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

const transport = (accessToken: string): TransportConfig => ({
  baseUrl: apiConfig.apiBaseUrl,
  // Read through a wrapper so tests that replace globalThis.fetch are honoured.
  fetch: (input, init) => fetch(input, init),
  headers: () =>
    withClientIpHeaders(withRequestIdHeader({ Authorization: `Bearer ${accessToken}` })),
});

/**
 * GETs answered once per incoming request (root loader and child loaders all read the profile):
 * concurrent callers in the same request share one call. Keyed on `getRequestId()`, so nothing is
 * shared outside a request or between requests; an entry is removed when its call settles, and
 * any write in the same request clears the request's entries first.
 */
const DEDUPED_GETS = new Set(["/user-profile"]);
interface InFlight {
  accessToken: string;
  schema: unknown;
  promise: Promise<unknown>;
}
const inFlight = new Map<string, InFlight>();

function clearRequestMemo(requestId: string | undefined) {
  if (!requestId) return;
  for (const key of inFlight.keys()) {
    if (key.startsWith(`${requestId} `)) inFlight.delete(key);
  }
}

/**
 * The single server-side client for the Flump backend, a thin wrapper on `callBackend` from
 * `@flump/api-client`: it calls `/v1`, adds the bearer token, the current request's id
 * (`x-request-id`, BE-07, M14) and the signed client address, bounds each attempt with a timeout,
 * retries GETs once on transient failures, and validates the body with the route's contract
 * schema. Every failure is a BackendError whose message never contains the token, base URL or
 * response body.
 */
export function backendFetch(endpoint: string, opts: BackendFetchEmptyOptions): Promise<undefined>;
export function backendFetch<T>(
  endpoint: string,
  opts: BackendFetchMaybeEmptyOptions<T>,
): Promise<T | undefined>;
export function backendFetch<T>(endpoint: string, opts: BackendFetchSchemaOptions<T>): Promise<T>;
export function backendFetch<T>(
  endpoint: string,
  opts: BackendFetchOptions<T>,
): Promise<T | undefined>;
export async function backendFetch<T>(
  endpoint: string,
  opts: BackendFetchOptions<T>,
): Promise<T | undefined> {
  const method = opts.method ?? "GET";
  const requestId = getRequestId();
  if (method !== "GET") {
    clearRequestMemo(requestId);
    return runWithRetries(endpoint, opts);
  }
  if (!requestId || !DEDUPED_GETS.has(endpoint) || opts.query) {
    return runWithRetries(endpoint, opts);
  }
  const key = `${requestId} ${endpoint}`;
  const existing = inFlight.get(key);
  if (existing && existing.accessToken === opts.accessToken && existing.schema === opts.schema) {
    // The shared body was parsed by this same schema; parsing it again types it without a cast
    // (the deduped schemas have no transforms, so a second parse is a pure check).
    const shared = await existing.promise;
    if (shared === undefined || opts.schema === null) return undefined;
    const parsed = opts.schema.safeParse(shared);
    if (!parsed.success) {
      const error = new BackendError("bad-response", endpoint);
      error.requestId = requestId;
      throw error;
    }
    return parsed.data;
  }
  const promise = runWithRetries(endpoint, opts);
  const entry: InFlight = { accessToken: opts.accessToken, schema: opts.schema, promise };
  inFlight.set(key, entry);
  const forget = () => {
    if (inFlight.get(key) === entry) inFlight.delete(key);
  };
  promise.then(forget, forget);
  return promise;
}

async function runWithRetries<T>(
  endpoint: string,
  opts: BackendFetchOptions<T>,
): Promise<T | undefined> {
  const method = opts.method ?? "GET";
  const retries = opts.retries ?? (method === "GET" ? 1 : 0);
  // One key for the call, so a retried POST replays instead of creating twice.
  const idempotencyKey =
    method === "POST" && opts.idempotencyKey === undefined
      ? crypto.randomUUID()
      : opts.idempotencyKey;
  const { accessToken, retries: _retries, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = opts;
  const cfg = transport(accessToken);

  let attempt = 0;
  while (true) {
    let failure: BackendError;
    try {
      const { data } = await callBackend<T>(cfg, endpoint, {
        ...rest,
        method,
        timeoutMs,
        idempotencyKey,
      });
      return data;
    } catch (err) {
      if (!(err instanceof BackendError)) throw err;
      failure = err;
    }
    const transient =
      failure.kind === "unavailable" ||
      failure.status === 502 ||
      failure.status === 503 ||
      failure.status === 504;
    if (method !== "GET" || !transient || attempt >= retries) throw failure;
    attempt += 1;
    await sleep(RETRY_DELAY_MS, opts.signal);
    if (opts.signal?.aborted) throw opts.signal.reason;
  }
}

export interface BackendFetchAllOptions<T>
  extends Omit<BackendFetchSchemaOptions<T[]>, "method" | "body" | "idempotencyKey" | "ifMatch"> {}

/** At most this many pages per list; more is a `bad-response` (a cursor that never ends). */
const MAX_LIST_PAGES = 100;

/**
 * GETs every page of a list route: follows `X-Next-Cursor` (sent back as `cursor=`) until it is
 * absent, each page through `backendFetch`'s retry. The rows are joined in order.
 */
export async function backendFetchAll<T>(
  endpoint: string,
  opts: BackendFetchAllOptions<T>,
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;
  const cfgFetch = (query: Record<string, QueryValue>) =>
    pageWithRetries<T>(endpoint, { ...opts, query });
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const result = await cfgFetch(cursor ? { ...opts.query, cursor } : { ...opts.query });
    rows.push(...result.data);
    cursor = result.nextCursor;
    if (!cursor) return rows;
  }
  throw new BackendError("bad-response", endpoint);
}

/** One page of a list, with the GET retry; returns the next cursor too. */
async function pageWithRetries<T>(
  endpoint: string,
  opts: BackendFetchAllOptions<T>,
): Promise<{ data: T[]; nextCursor: string | null }> {
  const { accessToken, retries = 1, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = opts;
  const cfg = transport(accessToken);
  let attempt = 0;
  while (true) {
    let failure: BackendError;
    try {
      return await callBackend<T[]>(cfg, endpoint, { ...rest, method: "GET", timeoutMs });
    } catch (err) {
      if (!(err instanceof BackendError)) throw err;
      failure = err;
    }
    const transient =
      failure.kind === "unavailable" ||
      failure.status === 502 ||
      failure.status === 503 ||
      failure.status === 504;
    if (!transient || attempt >= retries) throw failure;
    attempt += 1;
    await sleep(RETRY_DELAY_MS, opts.signal);
    if (opts.signal?.aborted) throw opts.signal.reason;
  }
}

export interface WorkspaceSnapshot {
  user: any;
  /** Server-only. Must never be returned from a loader (it would be serialised into the page). */
  accessToken?: string;
  accounts: any[];
  accountDetails: any[];
  userProfile: any | null;
  budgetEntries: any[];
  taxRecords: any[];
  bankConnections: any[];
  /**
   * The newest month with a completed monthly check-in ("YYYY-MM"), from `snapshot_checkins`
   * (CH-3). `null` when there has never been one; `undefined` when not asked for or when the
   * call failed, which callers treat as unknown and so show the check-in reminder.
   */
  latestCheckInMonth?: string | null;
}

export interface BackendBytes {
  body: ArrayBuffer;
  contentType: string;
  /** Decoded from the backend's `Content-Disposition: ...; filename*=UTF-8''...`, when present. */
  filename: string | null;
}

/**
 * Fetches a binary resource (a receipt) from the backend with the bearer token. One attempt, no
 * retry, bounded by the same timeout as `backendFetch`. Failures are BackendErrors that never
 * carry the token, URL or body.
 */
export async function backendFetchBytes(
  endpoint: string,
  opts: { accessToken: string; signal?: AbortSignal; timeoutMs?: number },
): Promise<BackendBytes> {
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort(opts.signal?.reason);
  if (opts.signal?.aborted) onCallerAbort();
  else opts.signal?.addEventListener("abort", onCallerAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error("timeout")),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    const res = await fetch(`${apiConfig.apiBaseUrl}${versionedPath(endpoint)}`, {
      method: "GET",
      headers: withClientIpHeaders(
        withRequestIdHeader({ Authorization: `Bearer ${opts.accessToken}` }),
      ),
      signal: controller.signal,
    });
    if (!res.ok) throw new BackendError(kindFromStatus(res.status), endpoint, res.status);
    // Headers are read through a name variable so the route-inventory scan never mistakes them for calls.
    const header = (name: string) => res.headers.get(name);
    const disposition = header("Content-Disposition") ?? "";
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    let filename: string | null = null;
    if (encoded) {
      try {
        filename = decodeURIComponent(encoded);
      } catch {
        filename = null;
      }
    }
    return {
      body: await res.arrayBuffer(),
      contentType: header("Content-Type") ?? "application/octet-stream",
      filename,
    };
  } catch (err) {
    if (err instanceof BackendError) throw err;
    if (opts.signal?.aborted) throw err;
    throw new BackendError("unavailable", endpoint, undefined, { cause: err });
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onCallerAbort);
  }
}

export interface WorkspaceFetchOptions {
  includeBudget?: boolean;
  includeTax?: boolean;
  includeConnections?: boolean;
  /** Also read the latest completed check-in month. A failure here never fails the page. */
  includeCheckIns?: boolean;
  ensureSignedIn?: boolean;
}

/**
 * Canonical server loader helper for fetching Flump workspace data.
 * Unifies auth, parallel fetching and error reporting across routes. Any failing requested endpoint
 * throws a route error via throwRouteError; an empty array is a valid empty account.
 */
export async function loadWorkspaceSnapshot(
  args: LoaderFunctionArgs,
  options: WorkspaceFetchOptions = {},
): Promise<WorkspaceSnapshot> {
  const {
    ensureSignedIn = true,
    includeBudget = false,
    includeTax = false,
    includeConnections = false,
    includeCheckIns = false,
  } = options;

  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn });

  if (!user) {
    return {
      user: null,
      accessToken,
      accounts: [],
      accountDetails: [],
      userProfile: null,
      budgetEntries: [],
      taxRecords: [],
      bankConnections: [],
    };
  }

  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/accounts"));
  const signal = args.request.signal;
  const list = <T>(endpoint: string, schema: ContractSchema<T[]>) =>
    backendFetchAll(endpoint, { accessToken, signal, schema });

  let accounts: any[];
  let userProfile: any | null;
  let budgetEntries: any[];
  let taxRecords: any[];
  let bankConnections: any[];
  const checkIns = includeCheckIns
    ? fetchLatestCheckInMonth(accessToken, signal)
    : Promise.resolve(undefined);
  try {
    [accounts, userProfile, budgetEntries, taxRecords, bankConnections] = await Promise.all([
      list("/accounts", AccountListResponse),
      backendFetch("/user-profile", { accessToken, signal, schema: UserProfileResponse }),
      includeBudget ? list("/budget-entries", BudgetEntryListResponse) : Promise.resolve([]),
      includeTax ? list("/tax-records", TaxRecordListResponse) : Promise.resolve([]),
      includeConnections
        ? list("/bank-connections", BankConnectionListResponse)
        : Promise.resolve([]),
    ]);
  } catch (err) {
    throwRouteError(err);
  }

  // Every account read carries its monthly history (M24): no separate /account-details call.
  const accountDetails = accounts.flatMap((a) => a.details || []);
  const latestCheckInMonth = await checkIns;

  return {
    user,
    accessToken,
    accounts,
    accountDetails,
    userProfile,
    budgetEntries,
    taxRecords,
    bankConnections,
    ...(includeCheckIns ? { latestCheckInMonth } : {}),
  };
}

/**
 * The latest finished check-in month (`GET /snapshots/check-ins`, system audit slice 4, CH-3).
 * Fails soft: the reminder is only a way in, so an unknown answer (undefined) shows it.
 */
function fetchLatestCheckInMonth(
  accessToken: string,
  signal: AbortSignal,
): Promise<string | null | undefined> {
  return backendFetch("/snapshots/check-ins", {
    accessToken,
    signal,
    schema: SnapshotCheckInsResponse,
  }).then(
    (res) => res.latestCompletedMonth,
    () => undefined,
  );
}

/** A workspace load with the financial picture built from it (decision 10, option B). */
export interface WorkspacePicture extends WorkspaceSnapshot {
  /** The engine's picture of the saved rows, or null when nobody is signed in. */
  picture: FinancialPicture | null;
}

/**
 * The rows the picture is built from, read from the backend with the caller's own token, so the
 * backend scopes every list to that user. Accounts carry their monthly rows (M24), so the
 * details come from the same response and the accounts are fetched once.
 */
function backendPictureSource(accessToken: string, signal: AbortSignal): PictureRowSource {
  let accounts: Promise<AccountListResponse> | undefined;
  const loadAccounts = () => {
    accounts ??= backendFetchAll("/accounts", { accessToken, signal, schema: AccountListResponse });
    return accounts;
  };
  const source: PictureRowSource = {
    profile: () =>
      backendFetch("/user-profile", { accessToken, signal, schema: UserProfileResponse }),
    accounts: loadAccounts,
    accountDetails: async () => (await loadAccounts()).flatMap((a) => a.details || []),
    budgetEntries: () =>
      backendFetchAll("/budget-entries", { accessToken, signal, schema: BudgetEntryListResponse }),
    // The contract infers its nullable fields as optional; the engine row holds null for each.
    taxRecords: async () =>
      (
        await backendFetchAll("/tax-records", {
          accessToken,
          signal,
          schema: TaxRecordListResponse,
        })
      ).map((record) => ({
        ...record,
        endDate: record.endDate ?? null,
        notes: record.notes ?? null,
        receiptFilename: record.receiptFilename ?? null,
        receiptMimeType: record.receiptMimeType ?? null,
      })),
  };
  // No cast: if a contract type stops fitting the engine's row types, check-types fails here.
  return source;
}

/**
 * The one loader helper for pages that show a derived figure. The engine's
 * `loadFinancialPicture` decides which rows the picture needs and asks this source for each, so
 * a page cannot leave a table out (PP-6). The page gets the rows it lists and the picture built
 * from those same rows.
 */
export async function loadWorkspacePicture(
  args: LoaderFunctionArgs,
  options: Pick<
    WorkspaceFetchOptions,
    "includeConnections" | "ensureSignedIn" | "includeCheckIns"
  > = {},
): Promise<WorkspacePicture> {
  const { ensureSignedIn = true, includeConnections = false, includeCheckIns = false } = options;
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn });
  if (!user) {
    return {
      user: null,
      accessToken,
      accounts: [],
      accountDetails: [],
      userProfile: null,
      budgetEntries: [],
      taxRecords: [],
      bankConnections: [],
      picture: null,
    };
  }
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/accounts"));
  const signal = args.request.signal;

  let loaded: LoadedFinancialPicture;
  let bankConnections: any[];
  const checkIns = includeCheckIns
    ? fetchLatestCheckInMonth(accessToken, signal)
    : Promise.resolve(undefined);
  try {
    [loaded, bankConnections] = await Promise.all([
      loadFinancialPicture(backendPictureSource(accessToken, signal), { asOf: new Date() }),
      includeConnections
        ? backendFetchAll("/bank-connections", {
            accessToken,
            signal,
            schema: BankConnectionListResponse,
          })
        : Promise.resolve([]),
    ]);
  } catch (err) {
    throwRouteError(err);
  }

  return {
    user,
    accessToken,
    accounts: loaded.rows.accounts as any[],
    accountDetails: loaded.rows.accountDetails as any[],
    userProfile: loaded.rows.profile,
    budgetEntries: loaded.rows.budgetEntries as any[],
    taxRecords: loaded.rows.taxRecords as any[],
    bankConnections,
    ...(includeCheckIns ? { latestCheckInMonth: await checkIns } : {}),
    picture: loaded.picture,
  };
}
