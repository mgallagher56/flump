import type { LoaderFunctionArgs } from "react-router";
import { apiConfig } from "~/config.server";
import { getAuthSession } from "~/utils/auth.server";
import { BackendError, kindFromStatus } from "./backend-error";
import { throwRouteError } from "./route-error.server";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface BackendFetchOptions {
  accessToken: string;
  method?: HttpMethod;
  body?: unknown;
  /** Caller cancellation, for example the loader's request.signal. */
  signal?: AbortSignal;
  /** Per-attempt timeout in milliseconds. Defaults to 8000. */
  timeoutMs?: number;
  /** Extra attempts after the first. Defaults to 1 for GET and 0 for everything else. */
  retries?: number;
}

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

/**
 * The single server-side client for the Flump backend. Adds the bearer token, bounds each attempt
 * with a timeout, retries GETs once on transient failures, and reports every failure as a
 * BackendError whose message never contains the token, base URL or response body.
 *
 * The timeout and caller signal are combined with a manual AbortController rather than
 * AbortSignal.any/timeout, so it behaves the same under fake timers and on older runtimes.
 */
export async function backendFetch<T>(endpoint: string, opts: BackendFetchOptions): Promise<T> {
  const method = opts.method ?? "GET";
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = opts.retries ?? (method === "GET" ? 1 : 0);
  const headers: Record<string, string> = { Authorization: `Bearer ${opts.accessToken}` };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const onCallerAbort = () => controller.abort(opts.signal?.reason);
    if (opts.signal?.aborted) onCallerAbort();
    else opts.signal?.addEventListener("abort", onCallerAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

    let failure: BackendError;
    try {
      const res = await fetch(`${apiConfig.apiBaseUrl}${endpoint}`, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      if (res.ok) {
        const text = await res.text();
        if (res.status === 204 || text === "") return undefined as T;
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new BackendError("bad-response", endpoint, res.status);
        }
      }
      let kind = kindFromStatus(res.status);
      if (res.status === 403) {
        // The backend marks a closed-beta refusal (E19 A7) so the UI can explain it.
        const refusal = await res.json().catch(() => null);
        if ((refusal as { error?: unknown } | null)?.error === "not_invited") kind = "not-invited";
      }
      failure = new BackendError(kind, endpoint, res.status);
    } catch (err) {
      if (err instanceof BackendError) {
        failure = err;
      } else if (opts.signal?.aborted) {
        // The caller cancelled (for example navigated away): not a backend failure.
        throw err;
      } else {
        failure = new BackendError("unavailable", endpoint, undefined, { cause: err });
      }
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onCallerAbort);
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

export interface PortfolioSnapshotData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalLiquidCash: number;
  totalInvestments: number;
  totalPensions: number;
  totalConsumerDebt: number;
  totalMortgageBalance: number;
  resolvedAccounts: any[];
  monthlyHistory: any[];
  currency: string;
}

export interface WorkspaceSnapshot {
  user: any;
  accessToken?: string;
  accounts: any[];
  accountDetails: any[];
  portfolioSnapshot: PortfolioSnapshotData | null;
  userProfile: any | null;
  budgetEntries: any[];
  taxRecords: any[];
  bankConnections: any[];
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
    const res = await fetch(`${apiConfig.apiBaseUrl}${endpoint}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${opts.accessToken}` },
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
  includePortfolioSnapshot?: boolean;
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
    includePortfolioSnapshot = false,
  } = options;

  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn });

  if (!user) {
    return {
      user: null,
      accessToken,
      accounts: [],
      accountDetails: [],
      portfolioSnapshot: null,
      userProfile: null,
      budgetEntries: [],
      taxRecords: [],
      bankConnections: [],
    };
  }

  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/accounts"));
  const signal = args.request.signal;
  const get = <T>(endpoint: string) => backendFetch<T>(endpoint, { accessToken, signal });

  let accounts: any[];
  let rawAccountDetails: any[];
  let userProfile: any | null;
  let budgetEntries: any[];
  let taxRecords: any[];
  let bankConnections: any[];
  let portfolioSnapshot: PortfolioSnapshotData | null;
  try {
    [
      accounts,
      rawAccountDetails,
      userProfile,
      budgetEntries,
      taxRecords,
      bankConnections,
      portfolioSnapshot,
    ] = await Promise.all([
      get<any[]>("/accounts"),
      get<any[]>("/account-details"),
      get<any | null>("/user-profile"),
      includeBudget ? get<any[]>("/budget-entries") : Promise.resolve([]),
      includeTax ? get<any[]>("/tax-records") : Promise.resolve([]),
      includeConnections ? get<any[]>("/bank-connections") : Promise.resolve([]),
      includePortfolioSnapshot
        ? get<PortfolioSnapshotData | null>("/portfolio-snapshot")
        : Promise.resolve(null),
    ]);
  } catch (err) {
    throwRouteError(err);
  }

  // An empty /account-details array is a valid answer; only then use the accounts' nested details.
  const accountDetails =
    rawAccountDetails && rawAccountDetails.length > 0
      ? rawAccountDetails
      : accounts.flatMap((a) => a.details || []);

  return {
    user,
    accessToken,
    accounts,
    accountDetails,
    portfolioSnapshot,
    userProfile,
    budgetEntries,
    taxRecords,
    bankConnections,
  };
}

export { throwRouteError } from "./route-error.server";
