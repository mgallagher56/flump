import { z } from "zod";
import { IsoDateTime, Money, Percent, Uuid } from "../primitives.js";

const AvatarUrl = z
  .string()
  .max(262144 + 64)
  .refine(
    (v) =>
      /^https:\/\//.test(v) ? v.length <= 2048 : /^data:image\/(png|jpeg|webp);base64,/.test(v),
    "must be an https URL or a png, jpeg or webp data URL",
  );

const ShortText = z.string().trim().max(120);
const PageKeyList = z.array(z.string().min(1).max(64)).max(20);

/**
 * PATCH /user-profile: every field `UserProfileService.updateProfile` reads. Fields the web sends
 * that the backend ignores (homeValue, ...) are deliberately absent: shadow mode reports
 * them as unknown keys. Both `null` and absent are accepted on nullable columns.
 */
export const UpdateProfileRequest = z.object({
  displayName: ShortText.nullish(),
  firstName: ShortText.nullish(),
  lastName: ShortText.nullish(),
  avatarUrl: AvatarUrl.nullish(),
  currency: z.string().length(3).optional(),
  country: z.string().min(2).max(2).optional(),
  employmentType: z.enum(["employed", "self-employed", "other"]).nullish(),
  annualSalary: Money.nullish(),
  monthlyTakeHome: Money.nullish(),
  hasSecondIncome: z.boolean().optional(),
  secondIncomeMonthly: Money.nullish(),
  hasRentalIncome: z.boolean().optional(),
  rentalIncomeMonthly: Money.nullish(),
  hasMortgage: z.boolean().optional(),
  mortgageType: z.enum(["repayment", "interest-only"]).optional(),
  propertyOwnershipShare: Percent.optional(),
  hasBuyToLet: z.boolean().optional(),
  buyToLetCount: z.number().int().min(0).max(1000).optional(),
  buyToLetPropertyValue: Money.nullish(),
  buyToLetMonthlyRental: Money.nullish(),
  buyToLetMortgageBalance: Money.nullish(),
  buyToLetMortgageRate: Percent.nullish(),
  buyToLetMortgageType: z.enum(["repayment", "interest-only"]).optional(),
  pensionPercent: Percent.optional(),
  pensionEmployerPercent: Percent.optional(),
  isSalarySacrifice: z.boolean().optional(),
  isSalarySacrificeEmployerNi: z.boolean().optional(),
  monthlySavingsTarget: Money.nullish(),
  savingsAllocationMode: z.enum(["total", "per_account"]).optional(),
  savingsDefaultInterestRate: Percent.optional(),
  enabledPages: PageKeyList.optional(),
  dashboardWidgets: PageKeyList.optional(),
  dashboardWidgetOrder: PageKeyList.optional(),
  dashboardWidgetSizes: z.record(z.string(), z.enum(["normal", "wide"])).optional(),
  dashboardWidgetConfig: z.record(z.string(), z.unknown()).optional(),
  customBudgetCategories: z.array(z.string().min(1).max(64)).max(50).optional(),
  onboardingCompleted: z.boolean().optional(),
  // E23 D06/D07 profile facts (null clears a fact back to "not set").
  taxRegion: z.enum(["ENGLAND", "WALES", "SCOTLAND", "NORTHERN_IRELAND"]).nullish(),
  birthYear: z.number().int().min(1900).max(2100).nullish(),
  studentLoanPlans: z
    .array(z.enum(["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"]))
    .max(5)
    .nullish(),
  housingStatus: z.enum(["renting", "mortgage", "own_outright"]).nullish(),
  monthlyHousingCost: Money.nullish(),
  monthlyOtherOutgoings: Money.nullish(),
});

export const UpdateChecklistRequest = z.object({
  step: z.string().min(1).max(64),
  completed: z.boolean(),
});

// --- Responses (E21) ---

const RepaymentType = z.enum(["repayment", "interest-only"]);
const NullableAmount = z.number().finite().nullable();

/**
 * The profile as `UserProfileService.formatProfile` puts it on the wire, plus `email` (the
 * caller's own address from the auth token, or null). Every key is always present: nullable
 * columns are null, never absent. Decimal columns arrive as numbers (B-05). `userId` is the
 * caller's own id, so it is harmless.
 */
export const UserProfileDto = z.strictObject({
  id: Uuid,
  userId: z.string().min(1),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  currency: z.string(),
  country: z.string(),
  employmentType: z.enum(["employed", "self-employed", "other"]).nullable(),
  annualSalary: NullableAmount,
  monthlyTakeHome: NullableAmount,
  hasSecondIncome: z.boolean(),
  secondIncomeMonthly: NullableAmount,
  hasRentalIncome: z.boolean(),
  rentalIncomeMonthly: NullableAmount,
  hasMortgage: z.boolean(),
  mortgageType: RepaymentType,
  propertyOwnershipShare: z.number().finite(),
  hasBuyToLet: z.boolean(),
  buyToLetCount: z.number().int(),
  buyToLetPropertyValue: NullableAmount,
  buyToLetMonthlyRental: NullableAmount,
  buyToLetMortgageBalance: NullableAmount,
  buyToLetMortgageRate: NullableAmount,
  buyToLetMortgageType: RepaymentType,
  pensionPercent: z.number().finite(),
  pensionEmployerPercent: z.number().finite(),
  isSalarySacrifice: z.boolean(),
  isSalarySacrificeEmployerNi: z.boolean(),
  monthlySavingsTarget: NullableAmount,
  savingsAllocationMode: z.enum(["total", "per_account"]),
  savingsDefaultInterestRate: z.number().finite(),
  setupChecklistCompletedSteps: z.array(z.string()),
  customBudgetCategories: z.array(z.string()),
  enabledPages: z.array(z.string()),
  dashboardWidgets: z.array(z.string()),
  dashboardWidgetOrder: z.array(z.string()),
  dashboardWidgetSizes: z.record(z.string(), z.enum(["normal", "wide"])),
  dashboardWidgetConfig: z.record(z.string(), z.unknown()),
  hasResetFinancialData: z.boolean(),
  onboardingCompleted: z.boolean(),
  taxRegion: z.enum(["ENGLAND", "WALES", "SCOTLAND", "NORTHERN_IRELAND"]).nullable(),
  birthYear: z.number().int().nullable(),
  studentLoanPlans: z
    .array(z.enum(["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"]))
    .nullable(),
  housingStatus: z.enum(["renting", "mortgage", "own_outright"]).nullable(),
  monthlyHousingCost: NullableAmount,
  monthlyOtherOutgoings: NullableAmount,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type UserProfileDto = z.infer<typeof UserProfileDto>;

/** GET /user-profile */
export const UserProfileResponse = UserProfileDto;
export type UserProfileResponse = z.infer<typeof UserProfileResponse>;

/** PATCH /user-profile */
export const UpdateProfileResponse = UserProfileDto;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponse>;

/** PATCH /user-profile/checklist: the same profile shape as GET (email included). */
export const UpdateChecklistResponse = UserProfileDto;
export type UpdateChecklistResponse = z.infer<typeof UpdateChecklistResponse>;

/** POST /user-profile/send-password-reset (failures are a 503 error, never `success: false`). */
export const SendPasswordResetResponse = z.strictObject({ success: z.literal(true) });
export type SendPasswordResetResponse = z.infer<typeof SendPasswordResetResponse>;

/**
 * The phrase the person types to confirm the destructive reset. The backend requires it in the
 * request body too, so the confirmation is not only a browser check.
 */
export const RESET_FINANCIAL_DATA_CONFIRMATION = "RESET";

/** POST /user-profile/reset-financial-data request body. */
export const ResetFinancialDataRequest = z.strictObject({
  confirmation: z.literal(RESET_FINANCIAL_DATA_CONFIRMATION),
});
export type ResetFinancialDataRequest = z.infer<typeof ResetFinancialDataRequest>;

/** POST /user-profile/reset-financial-data */
export const ResetFinancialDataResponse = z.strictObject({
  success: z.literal(true),
  message: z.string(),
  profile: UserProfileDto,
});
export type ResetFinancialDataResponse = z.infer<typeof ResetFinancialDataResponse>;

/**
 * The phrase the person types to confirm account deletion (BE-04). The backend requires it in
 * the request body too, so the confirmation is not only a browser check.
 */
// the word the person types to confirm deletion, not a credential
// nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_username
export const DELETE_USER_CONFIRMATION = "DELETE";

/** DELETE /user-profile request body. */
export const DeleteUserRequest = z.strictObject({
  confirmation: z.literal(DELETE_USER_CONFIRMATION),
});
export type DeleteUserRequest = z.infer<typeof DeleteUserRequest>;

/**
 * DELETE /user-profile. `deleted`: every stored row and the login are gone. `identity_pending`:
 * every stored row is gone, but removing the login failed; repeating the same request is safe and
 * finishes the job.
 */
export const DeleteUserResponse = z.strictObject({
  status: z.enum(["deleted", "identity_pending"]),
});
export type DeleteUserResponse = z.infer<typeof DeleteUserResponse>;

/** Version of the export document below. Bump on any breaking change to its shape. */
export const ACCOUNT_EXPORT_SCHEMA_VERSION = 1;

// --- Account export document (BE-04, GET /user-profile/export) ---
//
// One JSON document holding every row Flump stores for the caller, table by table, so a person can
// take a copy of their data (UK GDPR right of access and portability). Field names match the API
// (camelCase); values are as stored: money and percentages are numbers, `date` columns are
// YYYY-MM-DD, timestamps are ISO date-times. Secrets are never included: no MCP token hash and no
// bank access or refresh token. Documented in docs/legal/data-map.md ("Export document").

const ExportTimestamp = IsoDateTime;
const NullableExportTimestamp = IsoDateTime.nullable();
const NullableNumber = z.number().finite().nullable();
const NullableText = z.string().nullable();
const TextList = z.array(z.string()).nullable();

/** `profile`: the settings and facts the person entered (one row, or null if never created). */
export const AccountExportProfile = z.strictObject({
  id: Uuid,
  displayName: NullableText,
  firstName: NullableText,
  lastName: NullableText,
  avatarUrl: NullableText,
  currency: z.string(),
  country: z.string(),
  employmentType: NullableText,
  annualSalary: NullableNumber,
  monthlyTakeHome: NullableNumber,
  hasSecondIncome: z.boolean(),
  secondIncomeMonthly: NullableNumber,
  hasRentalIncome: z.boolean(),
  rentalIncomeMonthly: NullableNumber,
  hasMortgage: z.boolean(),
  mortgageType: z.string(),
  propertyOwnershipShare: NullableNumber,
  hasBuyToLet: z.boolean(),
  buyToLetCount: z.number().int(),
  buyToLetPropertyValue: NullableNumber,
  buyToLetMonthlyRental: NullableNumber,
  buyToLetMortgageBalance: NullableNumber,
  buyToLetMortgageRate: NullableNumber,
  buyToLetMortgageType: z.string(),
  pensionPercent: NullableNumber,
  pensionEmployerPercent: NullableNumber,
  isSalarySacrifice: z.boolean(),
  isSalarySacrificeEmployerNi: z.boolean(),
  monthlySavingsTarget: NullableNumber,
  savingsAllocationMode: z.string(),
  savingsDefaultInterestRate: NullableNumber,
  setupChecklistCompletedSteps: TextList,
  customBudgetCategories: TextList,
  enabledPages: TextList,
  dashboardWidgets: TextList,
  dashboardWidgetOrder: TextList,
  dashboardWidgetSizes: z.record(z.string(), z.string()).nullable(),
  dashboardWidgetConfig: z.record(z.string(), z.unknown()).nullable(),
  hasResetFinancialData: z.boolean(),
  onboardingCompleted: z.boolean(),
  taxRegion: NullableText,
  birthYear: z.number().int().nullable(),
  studentLoanPlans: TextList,
  housingStatus: NullableText,
  monthlyHousingCost: NullableNumber,
  monthlyOtherOutgoings: NullableNumber,
  createdAt: ExportTimestamp,
  updatedAt: ExportTimestamp,
});

/** `accounts`: each account and its current balance. */
export const AccountExportAccount = z.strictObject({
  id: Uuid,
  name: z.string(),
  type: z.string(),
  balance: z.number().finite(),
  interestRate: NullableNumber,
  monthlyContribution: NullableNumber,
  termMonths: z.number().int().nullable(),
  fixedRateEndDate: NullableText,
  isCurrent: z.boolean(),
  currency: z.string(),
  studentLoanPlan: NullableText,
  connectionId: Uuid.nullable(),
  externalAccountId: NullableText,
  createdAt: ExportTimestamp,
});

/** `accountDetails`: the month-end balance history of each account. */
export const AccountExportAccountDetail = z.strictObject({
  id: z.number().int(),
  accountId: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  value: z.number().finite(),
  asOfDate: z.string(),
  source: z.string(),
  importBatchId: Uuid.nullable(),
  updatedAt: ExportTimestamp,
});

/** `transactions`: account movements. */
export const AccountExportTransaction = z.strictObject({
  id: Uuid,
  accountId: z.string(),
  amount: z.number().finite(),
  description: z.string(),
  category: z.string(),
  timestamp: ExportTimestamp,
});

/** `bankConnections`: linked banks. Never the access or refresh token. */
export const AccountExportBankConnection = z.strictObject({
  id: Uuid,
  institutionId: z.string(),
  institutionName: z.string(),
  status: z.string(),
  authType: z.string(),
  expiresAt: NullableExportTimestamp,
  lastSyncedAt: ExportTimestamp,
  createdAt: ExportTimestamp,
  updatedAt: ExportTimestamp,
});

/**
 * `bankOAuthStates`: bank consent redirects started in the last ten minutes. Never the state, its
 * hash or the PKCE verifier.
 */
export const AccountExportBankOAuthState = z.strictObject({
  id: Uuid,
  institutionId: z.string(),
  expiresAt: ExportTimestamp,
  createdAt: ExportTimestamp,
});

/** `budgetEntries`: income and outgoings. */
export const AccountExportBudgetEntry = z.strictObject({
  id: Uuid,
  category: z.string(),
  name: z.string(),
  amount: z.number().finite(),
  frequency: z.string(),
  isIncome: z.boolean(),
  isPrimaryIncome: z.boolean(),
  isEssential: z.boolean(),
  notes: NullableText,
  isDefault: z.boolean(),
  createdAt: ExportTimestamp,
  updatedAt: ExportTimestamp,
});

/** `taxRecords`: income and expense records, with any receipt as a base64 data URL. */
export const AccountExportTaxRecord = z.strictObject({
  id: Uuid,
  type: z.string(),
  source: z.string(),
  category: z.string(),
  name: z.string(),
  amount: z.number().finite(),
  frequency: z.string(),
  date: z.string(),
  endDate: NullableText,
  notes: NullableText,
  receiptFilename: NullableText,
  receiptMimeType: NullableText,
  receiptData: NullableText,
  createdAt: ExportTimestamp,
  updatedAt: ExportTimestamp,
});

/** `snapshotCheckins`: months whose balances the person confirmed. */
export const AccountExportSnapshotCheckin = z.strictObject({
  month: z.string(),
  completedAt: ExportTimestamp,
});

/** `importBatches`: spreadsheet imports, staged or committed, with what each changed. */
export const AccountExportImportBatch = z.strictObject({
  id: Uuid,
  status: z.string(),
  payload: z.unknown(),
  counts: z.unknown(),
  validationErrors: z.unknown(),
  revertData: z.unknown().nullable(),
  createdAt: ExportTimestamp,
  updatedAt: ExportTimestamp,
  committedAt: NullableExportTimestamp,
  revertedAt: NullableExportTimestamp,
  expiresAt: ExportTimestamp,
});

/** `mcpTokens`: AI connection tokens, metadata only. Never the token or its hash. */
export const AccountExportMcpToken = z.strictObject({
  id: Uuid,
  name: z.string(),
  tokenPrefix: z.string(),
  scopes: TextList,
  anonymizeInstitutions: z.boolean(),
  expiresAt: NullableExportTimestamp,
  lastUsedAt: NullableExportTimestamp,
  totalToolCalls: z.number().int(),
  revokedAt: NullableExportTimestamp,
  createdAt: ExportTimestamp,
});

/** `agentAuditEvents`: what each AI connection did (tool names and timings, no amounts). */
export const AccountExportAgentAuditEvent = z.strictObject({
  id: Uuid,
  tokenId: Uuid.nullable(),
  clientName: NullableText,
  toolName: z.string(),
  scopesUsed: TextList,
  outcome: z.string(),
  errorCode: NullableText,
  latencyMs: z.number().int(),
  responseBytes: z.number().int(),
  createdAt: ExportTimestamp,
});

/** GET /user-profile/export: the whole document (`schemaVersion` first). */
export const AccountExportDocument = z.strictObject({
  schemaVersion: z.literal(ACCOUNT_EXPORT_SCHEMA_VERSION),
  exportedAt: IsoDateTime,
  /** The caller's own user id; left out of every row below because it is the same everywhere. */
  userId: z.string().min(1),
  /** Plain-English notes on what is and is not included. */
  notes: z.array(z.string()).optional(),
  profile: AccountExportProfile.nullable(),
  accounts: z.array(AccountExportAccount),
  accountDetails: z.array(AccountExportAccountDetail),
  transactions: z.array(AccountExportTransaction),
  bankConnections: z.array(AccountExportBankConnection),
  bankOAuthStates: z.array(AccountExportBankOAuthState),
  budgetEntries: z.array(AccountExportBudgetEntry),
  taxRecords: z.array(AccountExportTaxRecord),
  snapshotCheckins: z.array(AccountExportSnapshotCheckin),
  importBatches: z.array(AccountExportImportBatch),
  mcpTokens: z.array(AccountExportMcpToken),
  agentAuditEvents: z.array(AccountExportAgentAuditEvent),
});
export type AccountExportDocument = z.infer<typeof AccountExportDocument>;

/** Keys of the export document that hold stored data (one per table). */
export type AccountExportKey = Exclude<
  keyof AccountExportDocument,
  "schemaVersion" | "exportedAt" | "userId" | "notes"
>;

/**
 * The row schema for each data key, in document order. The backend writes the sections in this
 * order and checks each table's projection against its schema.
 */
export const ACCOUNT_EXPORT_SECTIONS = {
  profile: AccountExportProfile,
  accounts: AccountExportAccount,
  accountDetails: AccountExportAccountDetail,
  transactions: AccountExportTransaction,
  bankConnections: AccountExportBankConnection,
  bankOAuthStates: AccountExportBankOAuthState,
  budgetEntries: AccountExportBudgetEntry,
  taxRecords: AccountExportTaxRecord,
  snapshotCheckins: AccountExportSnapshotCheckin,
  importBatches: AccountExportImportBatch,
  mcpTokens: AccountExportMcpToken,
  agentAuditEvents: AccountExportAgentAuditEvent,
} as const satisfies Record<AccountExportKey, z.ZodType>;
