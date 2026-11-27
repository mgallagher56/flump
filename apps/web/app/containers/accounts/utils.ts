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

/** Student loan repayment plans (stored values, matches the backend allow-list). */
export const STUDENT_LOAN_PLAN_OPTIONS = [
  { id: "PLAN_1", name: "Plan 1" },
  { id: "PLAN_2", name: "Plan 2" },
  { id: "PLAN_4", name: "Plan 4 (Scotland)" },
  { id: "PLAN_5", name: "Plan 5" },
  { id: "POSTGRAD", name: "Postgraduate" },
] as const;

export type AccountType = `${AccountTypeEnum}` | string;

/**
 * Mortgages, loans, credit cards, overdrafts and student loans are shown as amounts owed: the
 * engine's one list (E12 S6). (A student loan is still excluded from headline net worth, see
 * DECISIONS E23 D-5-B.)
 */
export const isLiabilityType = (type?: string | null): boolean => isOwedAccountType(type);
