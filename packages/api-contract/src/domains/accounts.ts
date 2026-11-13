import { z } from "zod";
import { Currency, Money, MoneyNonNegative, Name, Percent, Uuid } from "../primitives.js";

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
  externalAccountId: z.string().max(255).nullish(),
});
