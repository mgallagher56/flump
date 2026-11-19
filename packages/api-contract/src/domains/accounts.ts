import { z } from "zod";
import { pageQueryShape } from "../pagination.js";
import {
  Currency,
  IsoDate,
  IsoDateTime,
  Money,
  MoneyNonNegative,
  Name,
  Percent,
  ResponseMoney,
  Uuid,
} from "../primitives.js";

export const ACCOUNT_TYPES = [
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
export const AccountType = z.enum(ACCOUNT_TYPES);

export const ACCOUNT_SUBTYPES = [
  "easy_access",
  "notice",
  "regular_saver",
  "fixed_term",
  "general_savings",
  "cash_isa",
  "lifetime_isa",
  "stocks_and_shares_isa",
  "general_investment",
  "residential_mortgage",
  "btl_mortgage",
  /** Property kinds (system audit slice 4, L71): the home, or a property let out. */
  "home",
  "rental",
  /** Loan kinds (system audit slice 4): labels only, no figure reads them. */
  "car_finance",
  "buy_now_pay_later",
  "other_loan",
] as const;
export const AccountSubtype = z.enum(ACCOUNT_SUBTYPES);

/** The subtypes each account type takes. A subtype on any other type is refused. */
export const ACCOUNT_SUBTYPES_BY_TYPE: Readonly<
  Partial<Record<(typeof ACCOUNT_TYPES)[number], readonly (typeof ACCOUNT_SUBTYPES)[number][]>>
> = {
  Saving: [
    "easy_access",
    "notice",
    "regular_saver",
    "fixed_term",
    "general_savings",
    "cash_isa",
    "lifetime_isa",
  ],
  Investment: ["stocks_and_shares_isa", "general_investment"],
  Mortgage: ["residential_mortgage", "btl_mortgage"],
  Property: ["home", "rental"],
  Loan: ["car_finance", "buy_now_pay_later", "other_loan"],
};

/** How a mortgage is repaid (system audit slice 4): stored on the Mortgage account. */
export const MORTGAGE_REPAYMENT_TYPES = ["repayment", "interest-only"] as const;
export const MortgageRepaymentType = z.enum(MORTGAGE_REPAYMENT_TYPES);
export type MortgageRepaymentType = z.infer<typeof MortgageRepaymentType>;

/** The account types that take a credit limit and a 0% interest end date. */
export const CREDIT_FIELD_ACCOUNT_TYPES: readonly (typeof ACCOUNT_TYPES)[number][] = [
  "Credit Card",
  "Overdraft",
];

export const TermMonths = z.number().int().min(1).max(600);

export const STUDENT_LOAN_PLANS = ["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"] as const;
export const StudentLoanPlan = z.enum(STUDENT_LOAN_PLANS);

export const ACCOUNT_OWNERSHIPS = ["sole", "joint"] as const;
export const AccountOwnership = z.enum(ACCOUNT_OWNERSHIPS);
export type AccountOwnership = z.infer<typeof AccountOwnership>;

export const SharePercent = z.number().int().min(1).max(100);

/**
 * POST /accounts. Today's backend accepts any string for `type` and any JSON for `balance`;
 * the contract is the stricter shape the web actually sends.
 */
export const CreateAccountRequest = z.strictObject({
  name: Name,
  type: AccountType,
  /** Optional subtype (e.g. easy_access, cash_isa, stocks_and_shares_isa, residential_mortgage, btl_mortgage). */
  accountSubtype: AccountSubtype.nullish(),
  /**
   * Either sign is accepted. The backend stores a liability (Mortgage, Credit Card, Loan,
   * Overdraft, Student Loan) as minus its absolute value and keeps any other type's sign (BE-05
   * stored-balance rule, E23 C-15).
   */
  balance: Money,
  currency: Currency.nullish(),
  interestRate: Percent.nullish(),
  monthlyContribution: MoneyNonNegative.nullish(),
  /** Credit Card and Overdraft accounts: optional credit/overdraft limit (usable even at £0 balance). */
  creditLimit: MoneyNonNegative.nullish(),
  /** Credit Card and Overdraft accounts: optional 0% promotional interest end date (YYYY-MM-DD). */
  promoZeroPercentUntil: IsoDate.nullish(),
  /** Student Loan accounts only. */
  studentLoanPlan: StudentLoanPlan.nullish(),
  ownership: AccountOwnership.optional(),
  sharePercent: SharePercent.nullish(),
  isCurrent: z.boolean().optional(),
  /** Mortgages and loans: whole months, 1 to 600 (the service enforces the same range). */
  termMonths: TermMonths.nullish(),
  fixedRateEndDate: IsoDate.nullish(),
  /**
   * Mortgage accounts only: the Property account the mortgage is on, one of the caller's own
   * (system audit slice 4). Null means not linked.
   */
  linkedAccountId: Uuid.nullish(),
  /** Mortgage accounts only. */
  repaymentType: MortgageRepaymentType.nullish(),
  connectionId: Uuid.nullish(),
  externalAccountId: z.string().max(255).nullish(),
});

/**
 * PATCH and PUT /accounts/:id. Absent means "leave alone". `null` is accepted only on nullable
 * columns; `null` on name, type or balance is a contract violation (it hits a NOT NULL column).
 * `currency: null` is tolerated because the service treats it as "not provided".
 */
export const UpdateAccountRequest = z.strictObject({
  name: Name.optional(),
  type: AccountType.optional(),
  accountSubtype: AccountSubtype.nullish(),
  /** Either sign is accepted; stored by the same rule as on create (a type change re-signs it). */
  balance: Money.optional(),
  currency: Currency.nullish(),
  interestRate: Percent.nullish(),
  monthlyContribution: MoneyNonNegative.nullish(),
  creditLimit: MoneyNonNegative.nullish(),
  promoZeroPercentUntil: IsoDate.nullish(),
  /** Student Loan accounts only. */
  studentLoanPlan: StudentLoanPlan.nullish(),
  ownership: AccountOwnership.optional(),
  sharePercent: SharePercent.nullish(),
  isCurrent: z.boolean().optional(),
  termMonths: TermMonths.nullish(),
  fixedRateEndDate: IsoDate.nullish(),
  linkedAccountId: Uuid.nullish(),
  repaymentType: MortgageRepaymentType.nullish(),
  externalAccountId: z.string().max(255).nullish(),
});

/**
 * POST /accounts/mortgage-with-property: a mortgage and the property it is on, created and linked
 * in one transaction (system audit slice 4; replaces the browser's two calls from PR 779). The
 * property takes the mortgage's ownership and share unless it is given its own (decision 14
 * option B: a suggestion when the pair is first set up; either can differ afterwards). Its kind
 * follows the mortgage's: a buy-to-let mortgage's property is a rental, any other is the home.
 */
export const CreateMortgageWithPropertyRequest = z.strictObject({
  mortgage: CreateAccountRequest.omit({
    type: true,
    linkedAccountId: true,
    connectionId: true,
    externalAccountId: true,
  }),
  property: z.strictObject({
    name: Name.optional(),
    /** The whole property's value, above 0. */
    balance: MoneyNonNegative.refine((v) => v > 0, "balance must be above 0"),
    ownership: AccountOwnership.optional(),
    sharePercent: SharePercent.nullish(),
  }),
});

// ---------------------------------------------------------------------------------------------
// Responses (the 2xx JSON body after JSON.stringify: Date -> ISO string, decimals as numbers).
// ---------------------------------------------------------------------------------------------

/** A computed or stored amount in a response: finite, not held to the 2-dp request rule (D9). */
const Amount = ResponseMoney;
/** A rate in a response (4.5 means 4.5%), not money. */
const Rate = z.number().finite();
const Int = z.number().int();

/** The caller's own user id (an identity-provider id, not always a UUID). */
const OwnerId = z.string().min(1);

export const ACCOUNT_DETAIL_SOURCES = [
  "onboarding",
  "manual",
  "connected",
  "backfill",
  "agent",
  /** R2-5 check-in: "No change" recorded last month's figure again. */
  "confirmed",
  /** R2-5 check-in: a loan balance worked out from its rate and payment, which the user kept. */
  "calculated",
] as const;
export const AccountDetailSource = z.enum(ACCOUNT_DETAIL_SOURCES);

/** One monthly value of an account (the `account_details` row as stored). */
export const AccountDetailDto = z.strictObject({
  id: Int,
  accountId: Uuid,
  userId: OwnerId,
  year: Int,
  month: Int.min(1).max(12),
  /** Signed: a liability's history is stored negative (BE-05 stored-balance rule). */
  value: Amount,
  asOfDate: IsoDate,
  source: AccountDetailSource,
  /** The import batch that wrote the value (E17 PR C), else null. */
  importBatchId: Uuid.nullable(),
  updatedAt: IsoDateTime,
});
export type AccountDetailDto = z.infer<typeof AccountDetailDto>;

// No `userId` or `externalAccountId` (BE-09, audit L3): the caller knows who they are, and the
// provider's account id is an internal sync key.
const accountShape = {
  id: Uuid,
  name: z.string(),
  type: AccountType,
  /** Optional so a response from a backend without the column still parses. */
  accountSubtype: AccountSubtype.nullish(),
  /**
   * Signed: a liability (Mortgage, Credit Card, Loan, Overdraft, Student Loan) is always negative
   * (BE-05 stored-balance rule, enforced by a database check); other types keep their sign.
   */
  balance: Amount,
  interestRate: Rate.nullable(),
  monthlyContribution: Amount.nullable(),
  creditLimit: Amount.nullish(),
  promoZeroPercentUntil: IsoDate.nullish(),
  termMonths: Int.nullable(),
  fixedRateEndDate: IsoDate.nullable(),
  isCurrent: z.boolean(),
  currency: Currency,
  studentLoanPlan: StudentLoanPlan.nullable(),
  ownership: AccountOwnership.default("sole"),
  sharePercent: SharePercent.nullable().default(null),
  /** Mortgage accounts: the linked Property account. Optional so an older response still parses. */
  linkedAccountId: Uuid.nullish(),
  /** Mortgage accounts: how it is repaid, or null when not set. */
  repaymentType: MortgageRepaymentType.nullish(),
  connectionId: Uuid.nullable(),
  createdAt: IsoDateTime,
  /** The resource version: `If-Match: "<updatedAt>"` makes an update conditional (BE-09). */
  updatedAt: IsoDateTime,
};

/** An account as create, update and the balance check-in return it. */
export const AccountDto = z.strictObject(accountShape);
export type AccountDto = z.infer<typeof AccountDto>;

/** An account with its monthly history, as the reads return it. */
export const AccountWithDetailsDto = z.strictObject({
  ...accountShape,
  details: z.array(AccountDetailDto),
});
export type AccountWithDetailsDto = z.infer<typeof AccountWithDetailsDto>;

/** GET /accounts */
export const AccountListResponse = z.array(AccountWithDetailsDto);
export type AccountListResponse = z.infer<typeof AccountListResponse>;

/**
 * How much monthly history `GET /accounts` returns with each account (system audit slice 9,
 * DB-12): `none` an empty list, `latest` the newest recorded month only, `all` every month oldest
 * first. Leaving it out means `all`, the answer before the option existed, so no caller changes.
 * `details` is always present in the response; only its length changes.
 */
export const ACCOUNT_DETAILS_OPTIONS = ["none", "latest", "all"] as const;
export const AccountDetailsOption = z.enum(ACCOUNT_DETAILS_OPTIONS);
export type AccountDetailsOption = z.infer<typeof AccountDetailsOption>;

/** GET /accounts query: the paging fields and the `details` option. */
export const AccountListQuery = z.strictObject({
  ...pageQueryShape("accounts"),
  details: AccountDetailsOption.optional(),
});
export type AccountListQuery = z.infer<typeof AccountListQuery>;

/** GET /accounts/:id */
export const AccountResponse = AccountWithDetailsDto;
export type AccountResponse = z.infer<typeof AccountResponse>;

/** GET /account-details and GET /accounts/:id/details */
export const AccountDetailListResponse = z.array(AccountDetailDto);
export type AccountDetailListResponse = z.infer<typeof AccountDetailListResponse>;

/** POST /accounts */
export const CreateAccountResponse = AccountDto;
export type CreateAccountResponse = z.infer<typeof CreateAccountResponse>;

/** PATCH and PUT /accounts/:id */
export const UpdateAccountResponse = AccountDto;
export type UpdateAccountResponse = z.infer<typeof UpdateAccountResponse>;

/** POST /accounts/mortgage-with-property */
export const CreateMortgageWithPropertyResponse = z.strictObject({
  mortgage: AccountDto,
  property: AccountDto,
});
export type CreateMortgageWithPropertyResponse = z.infer<typeof CreateMortgageWithPropertyResponse>;

/** DELETE /accounts/:id */
export const DeleteAccountResponse = z.strictObject({ success: z.literal(true) });
export type DeleteAccountResponse = z.infer<typeof DeleteAccountResponse>;

export const ACCOUNT_CATEGORIES = [
  "cash",
  "savings",
  "investments",
  "pensions",
  "debt",
  "mortgages",
  "property",
  "studentLoans",
  "other",
] as const;
export const AccountCategory = z.enum(ACCOUNT_CATEGORIES);

/** finance-engine `ResolvedAccount`. */
export const ResolvedAccountDto = z.strictObject({
  id: z.string().min(1),
  name: z.string(),
  rawType: AccountType,
  category: AccountCategory,
  isAsset: z.boolean(),
  isLiability: z.boolean(),
  nominalBalance: Amount,
  /** Contribution to net worth under the user's own choices (0 when left out). */
  netWorthBalance: Amount,
  latestBalance: Amount,
  overdrawnAmount: Amount,
  interestRate: Rate,
  interestRateKnown: z.boolean(),
  monthlyContribution: Amount,
  monthlyContributionKnown: z.boolean(),
  currency: Currency,
  /** Absent when the account has no monthly history. */
  latestMonth: Int.min(1).max(12).optional(),
  latestYear: Int.optional(),
  history: z.array(z.strictObject({ year: Int, month: Int.min(1).max(12), value: Amount })),
});
export type ResolvedAccountDto = z.infer<typeof ResolvedAccountDto>;

/** finance-engine `NetWorthLeftOut`. */
export const NetWorthLeftOut = z.enum(["property", "mortgage", "studentLoan", "homeValueMissing"]);
export type NetWorthLeftOut = z.infer<typeof NetWorthLeftOut>;

/** finance-engine `MonthlyPortfolioHistoryPoint`. */
export const PortfolioHistoryPointDto = z.strictObject({
  year: Int,
  month: Int.min(1).max(12),
  /** "Jan 2026" */
  label: z.string(),
  netWorth: Amount,
  totalAssets: Amount,
  totalLiabilities: Amount,
});
export type PortfolioHistoryPointDto = z.infer<typeof PortfolioHistoryPointDto>;

// Parsed request types (z.output: what a handler receives in enforce mode).
export type CreateAccountRequest = z.infer<typeof CreateAccountRequest>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequest>;
export type CreateMortgageWithPropertyRequest = z.infer<typeof CreateMortgageWithPropertyRequest>;
