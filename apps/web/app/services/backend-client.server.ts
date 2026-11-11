import type { LoaderFunctionArgs } from "react-router";
import { apiConfig } from "~/config.server";
import { authHeader, getAuthSession } from "~/utils/auth.server";
import { BackendError, kindFromStatus } from "./backend-error";

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
      failure = new BackendError(kindFromStatus(res.status), endpoint, res.status);
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

export interface WorkspaceFetchOptions {
  includeBudget?: boolean;
  includeTax?: boolean;
  includeConnections?: boolean;
  includePortfolioSnapshot?: boolean;
  ensureSignedIn?: boolean;
}

/**
 * Canonical server loader helper for fetching Flump workspace data.
 * Unifies auth headers, parallel fetching, error handling, and default fallbacks across routes.
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

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const headers = authHeader({ accessToken });

  const fetchJson = async <T>(endpoint: string, fallback: T): Promise<T> => {
    try {
      const res = await fetch(`${apiUrl}${endpoint}`, { headers });
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch {
      return fallback;
    }
  };

  const [
    accounts,
    rawAccountDetails,
    userProfile,
    budgetEntries,
    taxRecords,
    bankConnections,
    portfolioSnapshot,
  ] = await Promise.all([
    fetchJson<any[]>("/accounts", []),
    fetchJson<any[]>("/account-details", []),
    fetchJson<any | null>("/user-profile", null),
    includeBudget ? fetchJson<any[]>("/budget-entries", []) : Promise.resolve([]),
    includeTax ? fetchJson<any[]>("/tax-records", []) : Promise.resolve([]),
    includeConnections ? fetchJson<any[]>("/bank-connections", []) : Promise.resolve([]),
    includePortfolioSnapshot
      ? fetchJson<PortfolioSnapshotData | null>("/portfolio-snapshot", null)
      : Promise.resolve(null),
  ]);

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
