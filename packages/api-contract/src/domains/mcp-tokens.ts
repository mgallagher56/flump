import { z } from "zod";
import { PAGE_LIMITS } from "../pagination.js";
import { IsoDateTime, ResponseMoney, Uuid } from "../primitives.js";
import { ResolvedAccountDto } from "./accounts.js";

/** Expiry choices (E17 D5-A). `null` ("never expires") is rejected. */
export const PAT_EXPIRY_DAYS = [7, 30, 90, 365] as const;

export const CreateMcpTokenRequest = z.strictObject({
  name: z.string().trim().min(1).max(64),
  expiryDays: z
    .number()
    .refine((v) => (PAT_EXPIRY_DAYS as readonly number[]).includes(v), "must be 7, 30, 90 or 365")
    .optional(),
  anonymizeInstitutions: z.boolean().optional(),
  /**
   * Opt in to the `write:stage` scope (E17 re-plan PR D): the token may stage an import batch for
   * the user to review, never commit, revert or delete. Default false.
   */
  allowStaging: z.boolean().optional(),
});

/**
 * The opt-in staging scope a token gets when minted with `allowStaging: true`. The source of
 * truth is `WRITE_STAGE_SCOPE` in `@flump/mcp` (packages/mcp does not depend on this package);
 * this copy is for web clients, and a backend test asserts the two are equal.
 */
export const WRITE_STAGE_SCOPE = "write:stage";

/** Most activity rows one page returns (PAGE_LIMITS.activity). */
export const MAX_ACTIVITY_PAGE = PAGE_LIMITS.activity.max;
/** Activity rows a page returns when the request names no `limit`. */
export const DEFAULT_ACTIVITY_PAGE = PAGE_LIMITS.activity.default;

/**
 * Opaque paging cursor for the activity route (a compound created_at plus id position, encoded by
 * the server). Clients pass back `nextBefore` unchanged and never build one.
 */
export const ActivityCursor = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/, "must be a cursor from nextBefore");

/**
 * GET /mcp-tokens/:id/activity query. `limit` defaults to DEFAULT_ACTIVITY_PAGE; `before` (the previous page's
 * `nextBefore`) pages back in time.
 */
export const McpTokenActivityQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(MAX_ACTIVITY_PAGE).optional(),
  before: ActivityCursor.optional(),
});
export type McpTokenActivityQuery = z.infer<typeof McpTokenActivityQuery>;

// --- Responses (E21) ---
// No response ever carries `tokenHash` or `revokedAt`; strict objects flag either if it leaks.
// The plaintext token (`rawToken`) appears in the create response only.

/** The masked display prefix, e.g. `flump_pat_ab12...cd34`. Never the full token. */
const TokenPrefix = z.string().regex(/^flump_pat_[0-9a-f]{4}\.\.\.[0-9a-f]{4}$/);

/** One row of GET /mcp-tokens (`McpTokenService.listTokens`). */
export const McpTokenDto = z.strictObject({
  id: Uuid,
  name: z.string(),
  tokenPrefix: TokenPrefix,
  scopes: z.array(z.string()),
  anonymizeInstitutions: z.boolean(),
  expiresAt: IsoDateTime.nullable(),
  lastUsedAt: IsoDateTime.nullable(),
  totalToolCalls: z.number().int().min(0),
  createdAt: IsoDateTime,
  isRevoked: z.boolean(),
  isExpired: z.boolean(),
});
export type McpTokenDto = z.infer<typeof McpTokenDto>;

/** GET /mcp-tokens */
export const McpTokenListResponse = z.array(McpTokenDto);
export type McpTokenListResponse = z.infer<typeof McpTokenListResponse>;

/** POST /mcp-tokens: the only response that carries the plaintext token, shown once. */
export const CreateMcpTokenResponse = z.strictObject({
  id: Uuid,
  name: z.string(),
  tokenPrefix: TokenPrefix,
  rawToken: z.string().regex(/^flump_pat_[0-9a-f]{32}$/),
  scopes: z.array(z.string()),
  anonymizeInstitutions: z.boolean(),
  expiresAt: IsoDateTime,
  createdAt: IsoDateTime,
});
export type CreateMcpTokenResponse = z.infer<typeof CreateMcpTokenResponse>;

/**
 * One audited MCP tool call (E17-N17). Identifiers, codes and timings only: never arguments,
 * results, amounts or the argument fingerprint.
 */
export const McpTokenActivityEvent = z.strictObject({
  id: Uuid,
  toolName: z.string(),
  outcome: z.enum(["ok", "error", "denied"]),
  errorCode: z.string().nullable(),
  scopesUsed: z.array(z.string()),
  clientName: z.string().nullable(),
  latencyMs: z.number().int().min(0),
  responseBytes: z.number().int().min(0),
  createdAt: IsoDateTime,
});
export type McpTokenActivityEvent = z.infer<typeof McpTokenActivityEvent>;

/** GET /mcp-tokens/:id/activity: newest first; `nextBefore` is null on the last page. */
export const McpTokenActivityResponse = z.strictObject({
  events: z.array(McpTokenActivityEvent),
  nextBefore: ActivityCursor.nullable(),
});
export type McpTokenActivityResponse = z.infer<typeof McpTokenActivityResponse>;

/** DELETE /mcp-tokens/:id */
export const RevokeMcpTokenResponse = z.strictObject({ success: z.literal(true) });
export type RevokeMcpTokenResponse = z.infer<typeof RevokeMcpTokenResponse>;

/**
 * A computed finance-engine result inside the context pack (health score, tax calculation, ...).
 * These are engine outputs typed in `@flump/finance-engine`, not stored rows: the contract pins
 * the pack's top two levels and leaves engine internals to the engine's own tests.
 */
const EngineResult = z.record(z.string(), z.unknown());

/** A budget entry as the pack carries it. `notes` is dropped when anonymised. */
const ContextPackBudgetEntry = z.strictObject({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  amount: ResponseMoney,
  frequency: z.string(),
  isIncome: z.boolean(),
  isEssential: z.boolean(),
  notes: z.string().nullable().optional(),
});

/** `FlumpAiContextPack` from `@flump/finance-engine`, after JSON serialisation. */
export const AiContextPackDto = z.strictObject({
  metadata: z.strictObject({
    generatedAt: IsoDateTime,
    schemaVersion: z.literal("1.0.0"),
    isAnonymized: z.boolean(),
    currency: z.string(),
  }),
  baseline: EngineResult,
  /** Neutral sentences that each state a figure. The pack carries no score, grade or stage. */
  observations: z.array(z.string()),
  portfolio: z.strictObject({
    netWorth: z.number(),
    totalAssets: z.number(),
    /** The "Home (your estimate)" property account, already inside totalAssets (D3a). */
    homeEstimate: z.number(),
    totalLiabilities: z.number(),
    totalLiquidCash: z.number(),
    totalInvestments: z.number(),
    totalPensions: z.number(),
    totalConsumerDebt: z.number(),
    totalMortgageBalance: z.number(),
    weightedSavingsRate: z.number(),
    monthlyHistory: z.array(EngineResult),
    /** Strict: this is the account data AI clients receive, so a leaked field must be flagged. */
    accounts: z.array(ResolvedAccountDto),
  }),
  debtSummary: z.strictObject({
    consumerDebts: z.array(EngineResult),
    totalStartingDebtGbp: z.number(),
    avalancheVsSnowballComparison: EngineResult,
    promoCliffAlerts: z.array(EngineResult),
    studentLoanEvaluation: EngineResult.optional(),
  }),
  /** From the financial picture: null where the user has not entered the figure (never a fake 0). */
  budgetSummary: z.strictObject({
    monthlyIncome: z.number().nullable(),
    essentialBillsMonthly: z.number().nullable(),
    discretionarySpendMonthly: z.number().nullable(),
    plannedSavingsMonthly: z.number().nullable(),
    monthlySurplus: z.number().nullable(),
    safeToSpend: z
      .strictObject({
        weeklyAllowance: z.number(),
        dailyAllowance: z.number(),
        monthlyDiscretionary: z.number(),
        fixedCommitments: z.number(),
      })
      .nullable(),
    emergencyRunwayMonths: z.number().nullable(),
    entries: z.array(ContextPackBudgetEntry),
  }),
  taxSummary: z.strictObject({
    currentTaxYear: z.string(),
    ukTaxCalculation: EngineResult,
    selfAssessmentLedgerSummary: EngineResult.optional(),
  }),
});
export type AiContextPackDto = z.infer<typeof AiContextPackDto>;

/** GET /mcp-tokens/context-pack: the pack as JSON plus its Markdown rendering. */
export const ContextPackResponse = z.strictObject({
  pack: AiContextPackDto,
  markdown: z.string(),
});
export type ContextPackResponse = z.infer<typeof ContextPackResponse>;

// Parsed request types (z.output: what a handler receives in enforce mode).
export type CreateMcpTokenRequest = z.infer<typeof CreateMcpTokenRequest>;
