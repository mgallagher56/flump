import type {
  BuildContextPackInput,
  FinancialBaseline,
  FlumpAiContextPack,
  RawAccount,
  TaxRecord,
} from "@flump/finance-engine";
import type { ScopeRequirement } from "./auth/scopes.js";
import type { VerifiedToken } from "./auth/token-verifier.js";

/** One stored monthly value (`account_details`), as the ranged reads return it. */
export interface AccountSnapshotRow {
  accountId: string;
  year: number;
  /** 1 to 12. */
  month: number;
  value: number;
  /** How the row got there: `onboarding`, `manual`, `connected` or `backfill` (E30). */
  source: string;
}

/** "YYYY-MM" bounds, inclusive. */
export interface MonthRange {
  from: string;
  to: string;
}

/** Per-account recorded-month coverage, computed by the provider without returning the values. */
export interface AccountCoverage {
  accountId: string;
  /** "YYYY-MM". */
  firstMonth: string;
  lastMonth: string;
  recordedMonths: number;
  /** Runs of months with no row between the first and last recorded month, inclusive bounds. */
  gaps: MonthRange[];
  /** Distinct sources of the account's rows, sorted. */
  sources: string[];
}

/** Tax-record fields sent to MCP. Receipt columns are never read (E20-N15, E17-N7). */
export type McpTaxRecord = Pick<
  TaxRecord,
  "id" | "type" | "source" | "category" | "name" | "amount" | "frequency" | "date" | "endDate"
> & { notes?: string | null };

/**
 * Read-only access to ONE user's data. Every method takes the caller's user id from the verified
 * token and must only ever return that user's rows (the authz harness proves it on real Postgres).
 * The ranged methods filter in the database; they never load the whole history to filter here.
 */
export interface McpUserDataProvider {
  getUserFinancialData(
    userId: string,
    options?: { anonymizeInstitutions?: boolean },
  ): Promise<BuildContextPackInput>;
  /** The user's accounts in stored (creation) order, without history rows. */
  getAccounts(userId: string): Promise<RawAccount[]>;
  /** The user's profile baseline (salary, region, ownership share). */
  getBaseline(userId: string): Promise<FinancialBaseline>;
  /**
   * Monthly rows in `range` (inclusive), plus, for each account, its latest row before
   * `range.from` so a value can be carried forward into the range. `accountIds` narrows to those
   * of the user's accounts; ids the user does not own match nothing.
   */
  getAccountSnapshots(
    userId: string,
    range: MonthRange & { accountIds?: readonly string[] },
  ): Promise<AccountSnapshotRow[]>;
  /** Coverage of every account that has at least one row. */
  getDataCoverage(userId: string): Promise<AccountCoverage[]>;
  /**
   * Tax records that can contribute to a month between `fromDate` and `toDate` ("YYYY-MM-DD",
   * inclusive): one-off and annual records dated in the range, and monthly records that start on
   * or before `toDate` and have not ended before `fromDate`.
   */
  getTaxRecords(
    userId: string,
    range: { fromDate: string; toDate: string },
  ): Promise<McpTaxRecord[]>;
}

/** One tool call, for audit. Never carries arguments or results (E17-N8). */
export interface McpAuditEvent {
  tool: string;
  outcome: "ok" | "error";
  errorCode?: string;
  durationMs: number;
}

export interface McpServerContext {
  token: VerifiedToken;
  dataProvider: McpUserDataProvider;
  contextPack?: FlumpAiContextPack;
  /** Scope hook used by `defineFlumpTool`. Falls back to the token's scopes when absent. */
  authorize?: (requirement: ScopeRequirement) => boolean;
  /** Optional audit sink; failures are swallowed. */
  audit?: (event: McpAuditEvent) => void | Promise<void>;
}
