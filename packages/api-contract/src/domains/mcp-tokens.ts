import { z } from "zod";
import { IsoDateTime, Uuid } from "../primitives.js";
import { ResolvedAccountDto } from "./accounts.js";

/** Expiry choices (E17 D5-A). `null` ("never expires") is rejected. */
export const PAT_EXPIRY_DAYS = [7, 30, 90, 365] as const;

export const CreateMcpTokenRequest = z.object({
  name: z.string().trim().min(1).max(64),
  expiryDays: z
    .number()
    .refine((v) => (PAT_EXPIRY_DAYS as readonly number[]).includes(v), "must be 7, 30, 90 or 365")
    .optional(),
  anonymizeInstitutions: z.boolean().optional(),
});

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
  amount: z.number().finite(),
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
  stageEvaluation: EngineResult,
  healthScore: EngineResult,
  portfolio: z.strictObject({
    netWorth: z.number(),
    totalAssets: z.number(),
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
