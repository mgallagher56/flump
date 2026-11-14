import { MCP_NOTICE } from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import type { McpStageImportInput } from "../../types.js";
import {
  batchIdSchema,
  IMPORT_ACCOUNT_TYPES,
  importBatchResult,
  importMonth,
  importRef,
  MAX_IMPORT_ACCOUNTS,
  MAX_IMPORT_ROWS,
  requireImports,
  toBatchResult,
} from "./common.js";

const twoDecimals = (v: number) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6;
const money = z
  .number()
  .finite()
  .refine((v) => Math.abs(v) < 1e10, "must be below 10 billion")
  .refine(twoDecimals, "at most 2 decimal places");

/**
 * Stages accounts and month-end balances for the user to review in Flump (E17 re-plan PR D). It
 * never commits: the server stores an import batch and touches no live data. The result carries
 * refs and counts only; account names are passed through to the server as data and never echoed.
 */
export const stageImport = defineFlumpTool({
  name: "stage_import",
  title: "Stage an import for review",
  description:
    "Stages the user's own account list and month-end balances (for example mapped from a spreadsheet) as an import batch for the user to review in Flump. Nothing is saved to their Flump data: the user opens reviewUrl, matches each ref to a new or existing account and commits there. Send large sheets in chunks: the first call returns batchId, pass it on later calls; give each call its own idempotencyKey (resending the same key returns the same batch without adding rows). Leave out months after the current month. Rows the server refuses come back in validationErrors as ref, month and code. Up to 5,000 rows and 200 accounts per batch, 3 open batches and 30 calls an hour.",
  input: {
    batchId: batchIdSchema
      .optional()
      .describe("Append to this open batch (from an earlier call); omit to start a new batch"),
    idempotencyKey: z
      .string()
      .regex(/^[A-Za-z0-9_.:-]{8,128}$/, "must be 8-128 of A-Z a-z 0-9 _ . : -")
      .describe("A new random key per chunk; resend the same key only to retry that chunk"),
    accounts: z
      .array(
        z.object({
          ref: importRef.describe("Your own short id for this account, such as acc1"),
          name: z.string().trim().min(1).max(120).describe("The account's name as in the sheet"),
          type: z.enum(IMPORT_ACCOUNT_TYPES),
          details: z
            .object({
              interestRate: z.number().min(0).max(100).optional().describe("4.5 means 4.5%"),
              monthlyContribution: money.refine((v) => v >= 0, "must not be negative").optional(),
              termMonths: z.number().int().min(1).max(600).optional(),
              fixedRateEndDate: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
                .optional(),
            })
            .optional(),
        }),
      )
      .max(MAX_IMPORT_ACCOUNTS)
      .describe(
        "Accounts in this chunk; a balance must name an account staged in this or an earlier chunk",
      ),
    balances: z
      .array(
        z.object({
          accountRef: importRef,
          month: importMonth.describe("YYYY-MM, not after the current month"),
          value: money.describe("The month-end balance as in the sheet, in pounds"),
        }),
      )
      .max(MAX_IMPORT_ROWS),
  },
  result: importBatchResult,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  async handler(input, ctx) {
    const imports = requireImports(ctx);
    // Copy listed fields only, so nothing unexpected reaches the backend.
    const payload: McpStageImportInput = {
      ...(input.batchId ? { batchId: input.batchId } : {}),
      idempotencyKey: input.idempotencyKey,
      accounts: input.accounts.map((a) => ({
        ref: a.ref,
        name: a.name,
        type: a.type,
        ...(a.details ? { details: { ...a.details } } : {}),
      })),
      balances: input.balances.map((b) => ({
        accountRef: b.accountRef,
        month: b.month,
        value: b.value,
      })),
    };
    const batch = await imports.stageImport(ctx.token, payload);
    return {
      result: toBatchResult(batch),
      provenance: { batch: "import_batches" },
      notice: MCP_NOTICE,
    };
  },
});
