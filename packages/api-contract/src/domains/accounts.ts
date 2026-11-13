import { z } from "zod";
import {
  Currency,
  IsoDate,
  IsoDateTime,
  Money,
  MoneyNonNegative,
  Name,
  Percent,
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
export const CreateAccountRequest = z.object({
  name: Name,
  type: AccountType,
  /** Signed: the web debt page sends negative balances for cards and loans (E23 C-15 owns the policy). */
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
export const UpdateAccountRequest = z.object({
  name: Name.optional(),
  type: AccountType.optional(),
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
export const UpdateBalancesRequest = z.object({
  balances: z
    .array(z.object({ id: Uuid, balance: Money }))
    .min(1)
    .max(100),
});

// ---------------------------------------------------------------------------------------------
// Responses (the 2xx JSON body after JSON.stringify: Date -> ISO string, decimals as numbers).
// ---------------------------------------------------------------------------------------------

/** A computed or stored amount in a response: finite, not held to the 2-dp request rule. */
const Amount = z.number().finite();
const Int = z.number().int();

/** The caller's own user id (an identity-provider id, not always a UUID). */
const OwnerId = z.string().min(1);

export const ACCOUNT_DETAIL_SOURCES = ["onboarding", "manual", "connected", "backfill"] as const;
export const AccountDetailSource = z.enum(ACCOUNT_DETAIL_SOURCES);

/** One monthly value of an account (the `account_details` row as stored). */
export const AccountDetailDto = z.strictObject({
  id: Int,
  accountId: Uuid,
  userId: OwnerId,
  year: Int,
  month: Int.min(1).max(12),
  /** Signed: liabilities are stored negative. */
  value: Amount,
  asOfDate: IsoDate,
  source: AccountDetailSource,
  updatedAt: IsoDateTime,
});
export type AccountDetailDto = z.infer<typeof AccountDetailDto>;

const accountShape = {
  id: Uuid,
  userId: OwnerId,
  name: z.string(),
  type: AccountType,
  /** Signed: liabilities are stored negative (E30 stored-balance rule). */
  balance: Amount,
  interestRate: Amount.nullable(),
  monthlyContribution: Amount.nullable(),
  termMonths: Int.nullable(),
  fixedRateEndDate: IsoDate.nullable(),
  isCurrent: z.boolean(),
  currency: Currency,
  studentLoanPlan: StudentLoanPlan.nullable(),
  connectionId: Uuid.nullable(),
  externalAccountId: z.string().nullable(),
  createdAt: IsoDateTime,
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
  netWorthBalance: Amount,
  latestBalance: Amount,
  overdrawnAmount: Amount,
  interestRate: Amount,
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
  /** Income-contingent: excluded from netWorth, totalLiabilities and debt totals (D-5-B). */
  totalStudentLoans: Amount,
  resolvedAccounts: z.array(ResolvedAccountDto),
  monthlyHistory: z.array(PortfolioHistoryPointDto),
  currency: Currency,
});
export type PortfolioSnapshotResponse = z.infer<typeof PortfolioSnapshotResponse>;
