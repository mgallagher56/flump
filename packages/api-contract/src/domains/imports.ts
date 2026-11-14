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
import { AccountDetailSource, AccountType, TermMonths } from "./accounts.js";
import { SnapshotMonth } from "./snapshots.js";

/** Rows (accounts plus balances) one import batch may hold across all its chunks. */
export const MAX_IMPORT_ROWS = 5000;
/** Accounts one import batch may hold across all its chunks. */
export const MAX_IMPORT_ACCOUNTS = 200;

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
 * batch (409 if sent with a different `batchId`); `batchId` appends a chunk to an open (staged)
 * batch of the caller's.
 */
export const StageImportRequest = z.object({
  batchId: Uuid.optional(),
  idempotencyKey: z
    .string()
    .regex(/^[A-Za-z0-9_.:-]{8,128}$/, "must be 8-128 of A-Z a-z 0-9 _ . : -"),
  accounts: z.array(ImportAccount).max(MAX_IMPORT_ACCOUNTS),
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

/**
 * POST /imports/:id/preview. A dry run of a commit with this account map, for the review page.
 * Writes nothing. Takes the same `accountMap` as commit; ticks are applied by the page.
 */
export const PreviewImportRequest = z.object({
  accountMap: z.record(ImportRef, Uuid.nullable()).optional(),
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
  /**
   * `staged`: monthly values held by the batch. new, overwrite, unchanged and skipped are null
   * until commit (nothing can be compared with live data before accounts are mapped), then say
   * what the commit wrote, left alone because equal, or skipped as protected.
   */
  counts: z.strictObject({
    staged: Count,
    new: Count.nullable(),
    overwrite: Count.nullable(),
    unchanged: Count.nullable(),
    skipped: Count.nullable(),
    errors: Count,
  }),
  /** Rows in the batch (accounts plus balances, across chunks). */
  rows: Count,
  /**
   * Rows refused by this stage call, also on a replay of the same idempotency key (empty on the
   * other routes). At most 100 listed.
   */
  validationErrors: z.array(
    z.strictObject({
      ref: ImportRef,
      month: SnapshotMonth.optional(),
      code: z.enum(IMPORT_VALIDATION_CODES),
    }),
  ),
  /**
   * Row keys the commit skipped as protected: an existing non-import value, or the current month
   * of a bank-connected account, not ticked in `overwriteManual`.
   */
  skippedManual: z.array(ImportRowKey),
  /** Set once reverted: rows restored, rows removed, rows left alone (changed since commit). */
  revert: z.strictObject({ restored: Count, removed: Count, kept: Count }).nullable(),
  createdAt: IsoDateTime,
  expiresAt: IsoDateTime,
  committedAt: IsoDateTime.nullable(),
  revertedAt: IsoDateTime.nullable(),
});
export type ImportBatchResponse = z.infer<typeof ImportBatchResponse>;

/** GET /imports: the caller's batches, newest first, at most 50. */
export const ImportBatchListResponse = z.array(ImportBatchResponse);
export type ImportBatchListResponse = z.infer<typeof ImportBatchListResponse>;

const ImportMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/**
 * POST /imports/:id/preview. Session auth only (never an MCP token), so unlike the other import
 * responses it carries the user's own staged account names and values for the review page.
 */
export const ImportPreviewResponse = z.strictObject({
  batchId: Uuid,
  status: z.literal("staged"),
  expiresAt: IsoDateTime,
  accounts: z.array(
    z.strictObject({
      ref: ImportRef,
      name: z.string(),
      type: AccountType,
      /** The existing account this ref is mapped to in the request, or null for a new account. */
      mappedAccountId: Uuid.nullable(),
      /** An existing account with the same name and type, when exactly one matches. */
      suggestedAccountId: Uuid.nullable(),
    }),
  ),
  /** One per valid staged value, by month then ref. Values are signed as stored. */
  rows: z.array(
    z.strictObject({
      key: ImportRowKey,
      ref: ImportRef,
      month: ImportMonth,
      value: z.number(),
      prior: z.number().nullable(),
      priorSource: AccountDetailSource.nullable(),
      status: z.enum(["new", "overwrite", "unchanged"]),
      /**
       * Commit skips this row unless its key is in `overwriteManual`: it would replace a value not
       * written by an import, or the current month of a bank-connected account.
       */
      needsTick: z.boolean(),
    }),
  ),
  totals: z.strictObject({
    new: Count,
    overwrite: Count,
    unchanged: Count,
    needsTick: Count,
    errors: Count,
  }),
});
export type ImportPreviewResponse = z.infer<typeof ImportPreviewResponse>;
