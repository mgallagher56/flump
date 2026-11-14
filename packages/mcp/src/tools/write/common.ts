import { z } from "zod";
import { FlumpToolError } from "../../errors.js";
import {
  MCP_IMPORT_STATUSES,
  MCP_IMPORT_VALIDATION_CODES,
  type McpImportBatch,
  type McpImportProvider,
  type McpServerContext,
} from "../../types.js";

/** Caps mirrored from the import backend (E17 re-plan section 7); the backend enforces them. */
export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_ACCOUNTS = 200;

/** The caller's own id for an account in the sheet. Never free text, so it is safe to echo. */
export const importRef = z
  .string()
  .regex(/^[A-Za-z0-9_.-]{1,64}$/, "must be 1-64 of A-Z a-z 0-9 _ . -");

export const importMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "must be YYYY-MM");

export const batchIdSchema = z.uuid();

/** The import backend's account types (the same list as the accounts API). */
export const IMPORT_ACCOUNT_TYPES = [
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
] as const;

/**
 * What the staging tools return: refs, counts and codes only. No account name or value is ever
 * part of this schema, so nothing from the sheet's free text can come back to the model.
 */
export const importBatchResult = z.object({
  batchId: z.string(),
  status: z.enum(MCP_IMPORT_STATUSES),
  /** True only after the user committed the batch in Flump. Staging never sets it. */
  committed: z.boolean(),
  reviewUrl: z.string(),
  rows: z.number(),
  counts: z.object({
    staged: z.number(),
    new: z.number().nullable(),
    overwrite: z.number().nullable(),
    unchanged: z.number().nullable(),
    skipped: z.number().nullable(),
    errors: z.number(),
  }),
  validationErrors: z.array(
    z.object({
      ref: importRef,
      month: importMonth.optional(),
      code: z.enum(MCP_IMPORT_VALIDATION_CODES),
    }),
  ),
  expiresAt: z.string(),
  committedAt: z.string().nullable(),
  revertedAt: z.string().nullable(),
  nextStep: z.string(),
  /** States that staging never saves, commits, undoes or deletes data. */
  note: z.string(),
});

export type ImportBatchResult = z.infer<typeof importBatchResult>;

const NEXT_STEP: Record<McpImportBatch["status"], string> = {
  staged:
    "Nothing has been saved to the user's Flump data. Ask the user to open reviewUrl in Flump, match each ref to a new or existing account, review the changes and commit them there. Then check progress with get_import_status.",
  committed:
    "The user reviewed and committed this batch in Flump. The counts say what was written, left unchanged or skipped.",
  reverted: "The user committed this batch in Flump and then undid it there.",
  expired:
    "This batch expired before it was committed, so nothing from it was saved. Stage the rows again if the user still wants them.",
};

/** Maps a provider batch to the tool result. Only listed fields are copied (never spread). */
export function toBatchResult(batch: McpImportBatch): ImportBatchResult {
  return {
    batchId: batch.batchId,
    status: batch.status,
    committed: batch.status === "committed",
    reviewUrl: batch.reviewUrl,
    rows: batch.rows,
    counts: {
      staged: batch.counts.staged,
      new: batch.counts.new,
      overwrite: batch.counts.overwrite,
      unchanged: batch.counts.unchanged,
      skipped: batch.counts.skipped,
      errors: batch.counts.errors,
    },
    validationErrors: batch.validationErrors.map((e) => ({
      ref: e.ref,
      ...(e.month ? { month: e.month } : {}),
      code: e.code,
    })),
    expiresAt: batch.expiresAt,
    committedAt: batch.committedAt,
    revertedAt: batch.revertedAt,
    nextStep: NEXT_STEP[batch.status],
    note: STAGING_NOTE,
  };
}

/** The staging provider, or UNAVAILABLE on a connection that cannot stage (stdio). */
export function requireImports(ctx: McpServerContext): McpImportProvider {
  if (!ctx.imports) {
    throw new FlumpToolError(
      "UNAVAILABLE",
      "Staging imports is not available on this connection.",
      {
        hint: "Staging works only over the remote Flump connection (not the local stdio server). Ask the user to connect remotely with a token that allows staging.",
      },
    );
  }
  return ctx.imports;
}

export const STAGING_NOTE =
  "Staged rows are held for review only. The user commits them in Flump; no tool can commit, undo or delete data.";
