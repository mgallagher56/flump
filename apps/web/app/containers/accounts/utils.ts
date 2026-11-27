import { isOwedAccountType } from "@flump/finance-engine";

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
  PROPERTY = "Property",
  STUDENT_LOAN = "Student Loan",
}

export type AccountType = `${AccountTypeEnum}` | string;

/**
 * Mortgages, loans, credit cards, overdrafts and student loans are shown as amounts owed: the
 * engine's one list (E12 S6). (A student loan is still excluded from headline net worth, see
 * DECISIONS E23 D-5-B.)
 */
export const isLiabilityType = (type?: string | null): boolean => isOwedAccountType(type);
