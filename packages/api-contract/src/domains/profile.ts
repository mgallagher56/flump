import { z } from "zod";
import { IsoDateTime, Money, PensionPercent, Percent, ResponseMoney, Uuid } from "../primitives.js";
import { MAX_BUDGET_CATEGORY_NAME_LENGTH, MAX_CUSTOM_BUDGET_CATEGORIES } from "./budget.js";
import {
  RetirementGrowthRatesSchema,
  RetirementHousingOverrideSchema,
  RetirementTargetSchema,
} from "./retirement.js";

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
 * The home sections, in their default order. A saved section order holds only these, each once
 * (empty means the default order). A refinement rather than an enum, so the published request
 * schema keeps its shape; the check runs on every PATCH all the same.
 */
export const DASHBOARD_SECTION_KEYS = [
  "debt",
  "mortgage",
  "savings",
  "pension",
  "tax",
  "budget",
  "accounts",
] as const;

const SectionOrder = PageKeyList.refine(
  (keys) =>
    new Set(keys).size === keys.length &&
    keys.every((k) => (DASHBOARD_SECTION_KEYS as readonly string[]).includes(k)),
  { message: "Each section may appear once, and only known sections." },
);

/** Where the person lives. Null (not answered) is never read as renting. */
export const HousingStatus = z.enum(["renting", "mortgage", "own_outright", "living_with_family"]);

/**
 * PATCH /user-profile: every field `UserProfileService.updateProfile` reads. Unknown keys are
 * rejected (BE-09). Both `null` and absent are accepted on nullable columns.
 */
export const UpdateProfileRequest = z.strictObject({
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
  // null clears an answer back to "not set" (owner decision 3; the columns have no default).
  pensionPercent: PensionPercent.nullish(),
  pensionEmployerPercent: PensionPercent.nullish(),
  isSalarySacrifice: z.boolean().nullish(),
  isSalarySacrificeEmployerNi: z.boolean().optional(),
  monthlySavingsTarget: Money.nullish(),
  savingsAllocationMode: z.enum(["total", "per_account"]).optional(),
  savingsDefaultInterestRate: Percent.optional(),
  enabledPages: PageKeyList.optional(),
  dashboardWidgets: PageKeyList.optional(),
  dashboardWidgetOrder: SectionOrder.optional(),
  dashboardWidgetSizes: z.record(z.string(), z.enum(["normal", "wide"])).optional(),
  dashboardWidgetConfig: z.record(z.string(), z.unknown()).optional(),
  customBudgetCategories: z
    .array(z.string().min(1).max(MAX_BUDGET_CATEGORY_NAME_LENGTH))
    .max(MAX_CUSTOM_BUDGET_CATEGORIES)
    .optional(),
  onboardingCompleted: z.boolean().optional(),
  // E23 D06/D07 profile facts (null clears a fact back to "not set").
  taxRegion: z.enum(["ENGLAND", "WALES", "SCOTLAND", "NORTHERN_IRELAND"]).nullish(),
  birthYear: z.number().int().min(1900).max(2100).nullish(),
  /** UX Batch E: day of the month the check-in falls on (null = the 1st). */
  checkInDay: z.number().int().min(1).max(31).nullish(),
  studentLoanPlans: z
    .array(z.enum(["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"]))
    .max(5)
    .nullish(),
  housingStatus: HousingStatus.nullish(),
  monthlyHousingCost: Money.nullish(),
  monthlyOtherOutgoings: Money.nullish(),
  /** Net worth choices: count property less its mortgage; count student loans as a debt. */
  netWorthCountsProperty: z.boolean().optional(),
  netWorthCountsStudentLoan: z.boolean().optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;

/**
 * PATCH /user-profile/checklist: set one named step done or not done, or record that the person
 * closed the checklist (decision 13: stored on the profile, not in the browser).
 */
export const UpdateChecklistRequest = z
  .strictObject({
    step: z.string().min(1).max(64).optional(),
    completed: z.boolean().optional(),
    dismissed: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.dismissed !== undefined
        ? body.step === undefined && body.completed === undefined
        : body.step !== undefined && body.completed !== undefined,
    { message: "Send a step and whether it is done, or whether the checklist is dismissed." },
  );
export type UpdateChecklistRequest = z.infer<typeof UpdateChecklistRequest>;

// --- Responses (E21) ---

const RepaymentType = z.enum(["repayment", "interest-only"]);
const NullableAmount = ResponseMoney.nullable();

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
  buyToLetMortgageRate: z.number().finite().nullable(),
  buyToLetMortgageType: RepaymentType,
  // null: not answered (owner decision 3). A stored value, including 5 and 3, is the user's answer.
  pensionPercent: z.number().finite().nullable(),
  pensionEmployerPercent: z.number().finite().nullable(),
  isSalarySacrifice: z.boolean().nullable(),
  isSalarySacrificeEmployerNi: z.boolean(),
  monthlySavingsTarget: NullableAmount,
  savingsAllocationMode: z.enum(["total", "per_account"]),
  savingsDefaultInterestRate: z.number().finite(),
  setupChecklistCompletedSteps: z.array(z.string()),
  /** The person closed the setup checklist (decision 13); a reset clears it. */
  setupChecklistDismissed: z.boolean(),
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
  checkInDay: z.number().int().nullable(),
  studentLoanPlans: z
    .array(z.enum(["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"]))
    .nullable(),
  housingStatus: HousingStatus.nullable(),
  monthlyHousingCost: NullableAmount,
  monthlyOtherOutgoings: NullableAmount,
  /** Net worth choice: Property values and Mortgage balances count (default true). */
  netWorthCountsProperty: z.boolean(),
  /** Net worth choice: student loans count as a debt (default false, D-5-B). */
  netWorthCountsStudentLoan: z.boolean(),
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

/** A terms and privacy notice version: a short identifier such as `2026-11-01`, no free text. */
export const TermsVersion = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/);

/**
 * POST /user-profile/terms-acceptance request body (BE-15, M-PRIV3). `version` must be the
 * version the backend currently serves (`TERMS_VERSION`), or the request is refused with
 * `terms_version_mismatch`.
 */
export const AcceptTermsRequest = z.strictObject({ version: TermsVersion });
export type AcceptTermsRequest = z.infer<typeof AcceptTermsRequest>;

/**
 * POST /user-profile/terms-acceptance. `recorded` is false when this version was already accepted
 * (the call is idempotent per version); a new version records a new acceptance.
 */
export const AcceptTermsResponse = z.strictObject({
  version: TermsVersion,
  recorded: z.boolean(),
});
export type AcceptTermsResponse = z.infer<typeof AcceptTermsResponse>;

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
  isSalarySacrifice: z.boolean().nullable(),
  isSalarySacrificeEmployerNi: z.boolean(),
  monthlySavingsTarget: NullableNumber,
  savingsAllocationMode: z.string(),
  savingsDefaultInterestRate: NullableNumber,
  setupChecklistCompletedSteps: TextList,
  setupChecklistDismissed: z.boolean(),
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
  checkInDay: z.number().int().nullable(),
  studentLoanPlans: TextList,
  housingStatus: NullableText,
  monthlyHousingCost: NullableNumber,
  monthlyOtherOutgoings: NullableNumber,
  /** Last authenticated request, day precision (BE-06: 24-month inactivity rule). */
  lastActiveAt: ExportTimestamp,
  netWorthCountsProperty: z.boolean(),
  netWorthCountsStudentLoan: z.boolean(),
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
  ownership: z.string(),
  sharePercent: NullableNumber,
  /** Optional so an export from a backend without these columns still parses. */
  accountSubtype: NullableText.optional(),
  creditLimit: NullableNumber.optional(),
  promoZeroPercentUntil: NullableText.optional(),
  connectionId: Uuid.nullable(),
  externalAccountId: NullableText,
  createdAt: ExportTimestamp,
  /** When the account last changed; the version behind its ETag (BE-09). */
  updatedAt: ExportTimestamp,
  /** Mortgage accounts (system audit slice 4). Optional so an older export still parses. */
  linkedAccountId: Uuid.nullish(),
  repaymentType: NullableText.optional(),
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
  /** Null on a line linked to a saved fact: it stores no amount of its own (see `linkKind`). */
  amount: z.number().finite().nullable(),
  frequency: z.string(),
  isIncome: z.boolean(),
  isPrimaryIncome: z.boolean(),
  isEssential: z.boolean(),
  notes: NullableText,
  isDefault: z.boolean(),
  /** E34 C1. Optional so an export from a backend without these columns still parses. */
  ownership: z.string().optional(),
  sharePercent: NullableNumber.optional(),
  /**
   * The saved fact the line is linked to ("take_home", "housing", "savings" or "debt"), or null. A
   * linked line's figure is read from the profile, or the account, in this same export. Optional
   * for exports from before it.
   */
  linkKind: NullableText.optional(),
  /** The account a savings or debt line reads (an id in this export's accounts), or null. */
  linkAccountId: NullableText.optional(),
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

/**
 * `idempotencyKeys`: which recent create requests were sent with an `Idempotency-Key` header,
 * and the status each got (BE-09). Never the key, the request hash or the stored response,
 * which repeats rows already in the sections above.
 */
export const AccountExportIdempotencyKey = z.strictObject({
  id: Uuid,
  routeId: z.string(),
  statusCode: z.number().int().nullable(),
  createdAt: ExportTimestamp,
});

/** `auditEvents`: sensitive actions on the account (BE-06): identifiers and counts, no amounts. */
export const AccountExportAuditEvent = z.strictObject({
  id: Uuid,
  action: z.string(),
  actorType: z.string(),
  targetId: Uuid.nullable(),
  requestId: NullableText,
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), TextList])),
  createdAt: ExportTimestamp,
});

/** `consents`: what the person agreed to (AI access, bank access) and when it was withdrawn. */
export const AccountExportConsent = z.strictObject({
  id: Uuid,
  kind: z.string(),
  version: z.string(),
  targetId: Uuid.nullable(),
  grantedAt: ExportTimestamp,
  withdrawnAt: NullableExportTimestamp,
});

export const AccountExportRetirementPlan = z.strictObject({
  id: Uuid,
  retirementAge: z.number().int().nullable(),
  planToAge: z.number().int().nullable(),
  target: RetirementTargetSchema.nullable(),
  housingOverride: RetirementHousingOverrideSchema.nullable(),
  statePensionAge: z.number().int().nullable(),
  statePensionAnnualForecastGbp: ResponseMoney.nullable(),
  statePensionQualifyingYears: z.number().int().nullable(),
  growthRates: RetirementGrowthRatesSchema,
  inflationRate: z.number().finite(),
  cashSavingsNominalRate: z.number().finite().nullable(),
  realRentGrowthRate: z.number().finite(),
  excludedAccountIds: z.array(Uuid),
  createdAt: ExportTimestamp,
  updatedAt: ExportTimestamp,
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
  retirementPlan: AccountExportRetirementPlan.nullable(),
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
  idempotencyKeys: z.array(AccountExportIdempotencyKey),
  auditEvents: z.array(AccountExportAuditEvent),
  consents: z.array(AccountExportConsent),
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
  retirementPlan: AccountExportRetirementPlan,
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
  idempotencyKeys: AccountExportIdempotencyKey,
  auditEvents: AccountExportAuditEvent,
  consents: AccountExportConsent,
} as const satisfies Record<AccountExportKey, z.ZodType>;
