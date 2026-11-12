import { z } from "zod";
import { Currency, MoneyNonNegative, Name, Percent, Uuid } from "../primitives.js";

export const ACCOUNT_TYPES = [
  "Current",
  "Saving",
  "Mortgage",
  "Loan",
  "Credit Card",
  "Owed",
  "Investment",
  "Pension",
] as const;
export const AccountType = z.enum(ACCOUNT_TYPES);

/**
 * POST /accounts. Today's backend accepts any string for `type` and any JSON for `balance`;
 * the contract is the stricter shape the web actually sends.
 */
export const CreateAccountRequest = z.object({
  name: Name,
  type: AccountType,
  balance: MoneyNonNegative,
  currency: Currency.nullish(),
  interestRate: Percent.nullish(),
  monthlyContribution: MoneyNonNegative.nullish(),
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
  balance: MoneyNonNegative.optional(),
  currency: Currency.nullish(),
  interestRate: Percent.nullish(),
  monthlyContribution: MoneyNonNegative.nullish(),
  isCurrent: z.boolean().optional(),
  externalAccountId: z.string().max(255).nullish(),
});
