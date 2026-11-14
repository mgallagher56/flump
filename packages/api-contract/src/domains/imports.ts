import { z } from "zod";
import {
  IsoDate,
  IsoDateTime,
  Money,
  MoneyNonNegative,
  Name,
  Percent,
  Uuid,
} from "../primitives.js";
import { AccountType, TermMonths } from "./accounts.js";
import { SnapshotMonth } from "./snapshots.js";

/** Rows (accounts plus balances) one import batch may hold across all its chunks. */
export const MAX_IMPORT_ROWS = 5000;

/**
 * The caller's own id for an account in the sheet, never a Flump id. Letters, digits, `_`, `.`
 * and `-` only, so a row key `ref:YYYY-MM` is unambiguous and never carries free text.
 */
export const ImportRef = z
  .string()
  .regex(/^[A-Za-z0-9_.-]{1,64}$/, "must be 1-64 of A-Z a-z 0-9 _ . -");

/** `ref:YYYY-MM`, one staged monthly value. */
export const ImportRowKey = z
  .string()
  .regex(/^[A-Za-z0-9_.-]{1,64}:\d{4}-(0[1-9]|1[0-2])$/, "must be ref:YYYY-MM");

export const ImportAccount = z.object({
  ref: ImportRef,
  name: Name,
  type: AccountType,
  details: z
    .object({
      interestRate: Percent.optional(),
      monthlyContribution: MoneyNonNegative.optional(),
      termMonths: TermMonths.optional(),
      fixedRateEndDate: IsoDate.optional(),
    })
    .optional(),
});

export const ImportBalance = z.object({
  accountRef: ImportRef,
  month: SnapshotMonth,
  /** Signed as in the sheet; liabilities are stored negative by account type, as snapshots are. */
  value: Money,
});

/**
 * POST /imports. Stages rows without touching live data. Same `idempotencyKey` replays the same
 * batch; `batchId` appends a chunk to an open (staged) batch of the caller's.
 */
export const StageImportRequest = z.object({
  batchId: Uuid.optional(),
  idempotencyKey: z
    .string()
    .regex(/^[A-Za-z0-9_.:-]{8,128}$/, "must be 8-128 of A-Z a-z 0-9 _ . : -"),
  accounts: z.array(ImportAccount).max(MAX_IMPORT_ROWS),
  balances: z.array(ImportBalance).max(MAX_IMPORT_ROWS),
});

export const ImportIdParams = z.object({ id: Uuid });

/**
 * POST /imports/:id/commit. `accountMap[ref]` is an existing account id of the caller's, or null
 * (or absent) to create a new account. Rows that would overwrite a value the commit did not write
 * from an import (`source` other than `agent`) are skipped unless their key is in
 * `overwriteManual`.
 */
export const CommitImportRequest = z.object({
  accountMap: z.record(ImportRef, Uuid.nullable()).optional(),
  overwriteManual: z.array(ImportRowKey).max(MAX_IMPORT_ROWS).optional(),
});

/** POST /imports/:id/revert takes no options. */
export const RevertImportRequest = z.object({});

export const IMPORT_BATCH_STATUSES = ["staged", "committed", "reverted", "expired"] as const;
export const ImportBatchStatus = z.enum(IMPORT_BATCH_STATUSES);

export const IMPORT_VALIDATION_CODES = [
  "future_month",
  "too_early",
  "bad_month",
  "bad_value",
  "unknown_account_ref",
] as const;

const Count = z.number().int().min(0);

// --- Responses (E21) ---
// Refs, row keys and counts only: never account names or values.

/** Every import route returns the batch in this shape. */
export const ImportBatchResponse = z.strictObject({
  batchId: Uuid,
  status: ImportBatchStatus,
  /** At stage: against nothing mapped yet, so every row is new. After commit: what was written. */
  counts: z.strictObject({ new: Count, overwrite: Count, unchanged: Count, errors: Count }),
  /** Rows in the batch (accounts plus balances, across chunks). */
  rows: Count,
  /** Rows refused by this stage call (empty on the other routes). At most 100 listed. */
  validationErrors: z.array(
    z.strictObject({
      ref: ImportRef,
      month: SnapshotMonth.optional(),
      code: z.enum(IMPORT_VALIDATION_CODES),
    }),
  ),
  /** Row keys the commit skipped because they would overwrite a non-import value. */
  skippedManual: z.array(ImportRowKey),
  /** Set once reverted: rows restored, rows removed, rows left alone (changed since commit). */
  revert: z.strictObject({ restored: Count, removed: Count, kept: Count }).nullable(),
  createdAt: IsoDateTime,
  expiresAt: IsoDateTime,
  committedAt: IsoDateTime.nullable(),
  revertedAt: IsoDateTime.nullable(),
});
export type ImportBatchResponse = z.infer<typeof ImportBatchResponse>;
