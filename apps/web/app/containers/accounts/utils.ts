import type { Account } from "./types";

export enum AccountTypeEnum {
  CURRENT = "Current",
  SAVING = "Saving",
  MORTGAGE = "Mortgage",
  LOAN = "Loan",
  CREDIT_CARD = "Credit Card",
  OVERDRAFT = "Overdraft",
  OWED = "Owed",
  INVESTMENT = "Investment",
  PENSION = "Pension",
}

export type AccountType = `${AccountTypeEnum}` | string;

export const isAccountTypeValid = (accountType: AccountTypeEnum, accounts: Account[]) =>
  !!accounts?.map(({ type }) => type).some((type) => type === accountType);

const LIABILITY_TYPES: string[] = [
  AccountTypeEnum.MORTGAGE,
  AccountTypeEnum.LOAN,
  AccountTypeEnum.CREDIT_CARD,
  AccountTypeEnum.OVERDRAFT,
];

/** Mortgages, loans, credit cards and overdrafts are liabilities. */
export const isLiabilityType = (type?: string | null): boolean =>
  LIABILITY_TYPES.includes(type ?? "");

/**
 * Liabilities are stored as minus the amount owed. Display them as the
 * positive amount owed; assets are returned unchanged.
 */
export const toDisplayBalance = <T extends number | undefined>(
  type: string | null | undefined,
  balance: T,
): T => (balance !== undefined && isLiabilityType(type) ? (Math.abs(balance) as T) : balance);
