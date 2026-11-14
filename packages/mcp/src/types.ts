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
  /** How the row got there: `onboarding`, `manual`, `connected`, `backfill` (E30) or `agent` (a committed import). */
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

/** One account row of a staged import. `ref` is the caller's own id; `name` is never echoed back. */
export interface McpImportAccount {
  ref: string;
  name: string;
  type: string;
  details?: {
    interestRate?: number;
    monthlyContribution?: number;
    termMonths?: number;
    fixedRateEndDate?: string;
  };
}

/** One month-end value of a staged import. */
export interface McpImportBalance {
  accountRef: string;
  /** "YYYY-MM". */
  month: string;
  value: number;
}

export interface McpStageImportInput {
  batchId?: string;
  idempotencyKey: string;
  accounts: McpImportAccount[];
  balances: McpImportBalance[];
}

export const MCP_IMPORT_STATUSES = ["staged", "committed", "reverted", "expired"] as const;
export const MCP_IMPORT_VALIDATION_CODES = [
  "future_month",
  "too_early",
  "bad_month",
  "bad_value",
  "unknown_account_ref",
] as const;

/** An import batch as the staging tools see it: refs, row keys and counts, never names or values. */
export interface McpImportBatch {
  batchId: string;
  status: (typeof MCP_IMPORT_STATUSES)[number];
  /** Where the user reviews and commits the batch in Flump. */
  reviewUrl: string;
  /** Rows in the batch (accounts plus balances, across chunks). */
  rows: number;
  counts: {
    staged: number;
    new: number | null;
    overwrite: number | null;
    unchanged: number | null;
    skipped: number | null;
    errors: number;
  };
  validationErrors: Array<{
    ref: string;
    month?: string;
    code: (typeof MCP_IMPORT_VALIDATION_CODES)[number];
  }>;
  createdAt: string;
  expiresAt: string;
  committedAt: string | null;
  revertedAt: string | null;
}

/**
 * Staging access for ONE user (E17 re-plan PR D). Deliberately has no commit, revert or delete:
 * committing needs a web session. Implementations take the verified token so they can enforce
 * `write:stage` themselves (server-side), not only trust the tool's own check. Throw
 * `FlumpToolError` for an expected refusal (cap, conflict, rate limit, not found).
 */
export interface McpImportProvider {
  stageImport(token: VerifiedToken, input: McpStageImportInput): Promise<McpImportBatch>;
  getImportStatus(token: VerifiedToken, batchId: string): Promise<McpImportBatch>;
}

/**
 * One tool call, for audit (E17-N17). Never carries arguments or results (E17-N8): only an
 * optional keyed fingerprint of the arguments, made by the context's `fingerprintArgs`.
 */
export interface McpAuditEvent {
  tool: string;
  outcome: "ok" | "error" | "denied";
  errorCode?: string;
  durationMs: number;
  /** UTF-8 bytes of the text sent back to the client. */
  responseBytes: number;
  /** The scopes the call needed that the token held. */
  scopesUsed: string[];
  /** HMAC of the validated arguments, or absent when no fingerprint function or key is set. */
  argsFingerprint?: string;
}

export interface McpServerContext {
  token: VerifiedToken;
  dataProvider: McpUserDataProvider;
  /** Staging access (PR D). Absent on transports that cannot stage, such as stdio. */
  imports?: McpImportProvider;
  contextPack?: FlumpAiContextPack;
  /** Scope hook used by `defineFlumpTool`. Falls back to the token's scopes when absent. */
  authorize?: (requirement: ScopeRequirement) => boolean;
  /**
   * Keyed fingerprint of a call's validated arguments for the audit row (the key stays in the
   * host). Return null when no key is configured. Failures are swallowed.
   */
  fingerprintArgs?: (args: unknown) => string | null;
  /** Optional audit sink; failures are swallowed. */
  audit?: (event: McpAuditEvent) => void | Promise<void>;
}
