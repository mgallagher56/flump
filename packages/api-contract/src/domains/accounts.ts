import { z } from "zod";
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

export const TermMonths = z.number().int().min(1).max(600);

export const STUDENT_LOAN_PLANS = ["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"] as const;
export const StudentLoanPlan = z.enum(STUDENT_LOAN_PLANS);

/**
 * POST /accounts. Today's backend accepts any string for `type` and any JSON for `balance`;
 * the contract is the stricter shape the web actually sends.
 */
export const CreateAccountRequest = z.strictObject({
  name: Name,
  type: AccountType,
  /**
   * Either sign is accepted. The backend stores a liability (Mortgage, Credit Card, Loan,
   * Overdraft, Student Loan) as minus its absolute value and keeps any other type's sign (BE-05
   * stored-balance rule, E23 C-15).
   */
  balance: Money,
  currency: Currency.nullish(),
  interestRate: Percent.nullish(),
  monthlyContribution: MoneyNonNegative.nullish(),
  /** Student Loan accounts only. */
  studentLoanPlan: StudentLoanPlan.nullish(),
  isCurrent: z.boolean().optional(),
  /** Mortgages and loans: whole months, 1 to 600 (the service enforces the same range). */
  termMonths: TermMonths.nullish(),
  fixedRateEndDate: IsoDate.nullish(),
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
  /** Either sign is accepted; stored by the same rule as on create (a type change re-signs it). */
  balance: Money.optional(),
  currency: Currency.nullish(),
  interestRate: Percent.nullish(),
  monthlyContribution: MoneyNonNegative.nullish(),
  /** Student Loan accounts only. */
  studentLoanPlan: StudentLoanPlan.nullish(),
  isCurrent: z.boolean().optional(),
  termMonths: TermMonths.nullish(),
  fixedRateEndDate: IsoDate.nullish(),
  externalAccountId: z.string().max(255).nullish(),
});

/**
 * PATCH /accounts/balances (monthly check-in). One transaction sets every balance and upserts the
 * current UK month's history row for each. An unknown or foreign id fails the whole batch (404).
 */
export const UpdateBalancesRequest = z.strictObject({
  balances: z
    .array(z.strictObject({ id: Uuid, balance: Money }))
    .min(1)
    .max(100),
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
  /**
   * Signed: a liability (Mortgage, Credit Card, Loan, Overdraft, Student Loan) is always negative
   * (BE-05 stored-balance rule, enforced by a database check); other types keep their sign.
   */
  balance: Amount,
  interestRate: Rate.nullable(),
  monthlyContribution: Amount.nullable(),
  termMonths: Int.nullable(),
  fixedRateEndDate: IsoDate.nullable(),
  isCurrent: z.boolean(),
  currency: Currency,
  studentLoanPlan: StudentLoanPlan.nullable(),
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

/** PATCH /accounts/balances: the updated accounts, in request order. */
export const UpdateBalancesResponse = z.array(AccountDto);
export type UpdateBalancesResponse = z.infer<typeof UpdateBalancesResponse>;

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

/** GET /portfolio-snapshot */
export const PortfolioSnapshotResponse = z.strictObject({
  netWorth: Amount,
  totalAssets: Amount,
  totalLiabilities: Amount,
  totalLiquidCash: Amount,
  totalInvestments: Amount,
  totalPensions: Amount,
  totalConsumerDebt: Amount,
  totalMortgageBalance: Amount,
  totalProperty: Amount,
  /**
   * Income-contingent, so never in debt totals (D-5-B). In netWorth and totalLiabilities only
   * when the user counts student loans.
   */
  totalStudentLoans: Amount,
  resolvedAccounts: z.array(ResolvedAccountDto),
  monthlyHistory: z.array(PortfolioHistoryPointDto),
  /**
   * What netWorth, the totals and monthlyHistory leave out under the user's own choices, in
   * display order. `homeValueMissing`: a mortgage counts with no home value saved beside it.
   */
  netWorthLeavesOut: z.array(NetWorthLeftOut),
  currency: Currency,
});
export type PortfolioSnapshotResponse = z.infer<typeof PortfolioSnapshotResponse>;

// Parsed request types (z.output: what a handler receives in enforce mode).
export type CreateAccountRequest = z.infer<typeof CreateAccountRequest>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequest>;
export type UpdateBalancesRequest = z.infer<typeof UpdateBalancesRequest>;
