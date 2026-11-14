import {
  type ImportBatch,
  type ImportCounts,
  type StagedAccount,
  type StagedBalance,
} from "../../entities/import-batch.entity";

/** E17 re-plan section 7 caps. */

/** Public limits, input and view shapes of the import primitive (E17). */
export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_ACCOUNTS = 200;
export const MAX_OPEN_BATCHES = 3;
export const IMPORT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_ERRORS_LISTED = 100;

export const ACCOUNT_TYPES = new Set([
  "Current",
  "Saving",
  "Mortgage",
  "Loan",
  "Credit Card",
  "Owed",
  "Investment",
  "Pension",
  "Property",
  "Student Loan",
  "Overdraft",
]);
export const REF = /^[A-Za-z0-9_.-]{1,64}$/;
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9_.:-]{8,128}$/;

type ImportValidationCode =
  | "future_month"
  | "too_early"
  | "bad_month"
  | "bad_value"
  | "unknown_account_ref";

export interface ImportValidationError {
  ref: string;
  month?: string;
  code: ImportValidationCode;
}

export interface StageImportInput {
  batchId?: string;
  idempotencyKey: string;
  accounts: StagedAccount[];
  balances: StagedBalance[];
}

export interface CommitImportInput {
  accountMap?: Record<string, string | null>;
  overwriteManual?: string[];
}

/** The one response shape of every import route: refs, row keys and counts, never names. */
export interface ImportBatchView {
  batchId: string;
  status: ImportBatch["status"];
  counts: Omit<ImportCounts, "rows">;
  rows: number;
  validationErrors: ImportValidationError[];
  skippedManual: string[];
  revert: { restored: number; removed: number; kept: number } | null;
  createdAt: string;
  expiresAt: string;
  committedAt: string | null;
  revertedAt: string | null;
}

export interface PreviewImportInput {
  accountMap?: Record<string, string | null>;
}

/** POST /imports/:id/preview (session auth only): the review page's dry run of a commit. */
export interface ImportPreviewView {
  batchId: string;
  status: "staged";
  expiresAt: string;
  accounts: Array<{
    ref: string;
    name: string;
    type: string;
    mappedAccountId: string | null;
    suggestedAccountId: string | null;
  }>;
  rows: Array<{
    key: string;
    ref: string;
    month: string;
    /** Signed as stored (liabilities negative), as is `prior`. */
    value: number;
    prior: number | null;
    priorSource: string | null;
    status: "new" | "overwrite" | "unchanged";
    needsTick: boolean;
  }>;
  totals: { new: number; overwrite: number; unchanged: number; needsTick: number; errors: number };
}
