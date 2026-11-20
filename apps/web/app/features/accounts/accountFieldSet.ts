import { canAccountBeJoint } from "@flump/finance-engine";
import {
  INVESTMENT_SUBTYPE_OPTIONS,
  LOAN_SUBTYPE_OPTIONS,
  MORTGAGE_SUBTYPE_OPTIONS,
  PROPERTY_SUBTYPE_OPTIONS,
  SAVINGS_SUBTYPE_OPTIONS,
} from "./accountSubtypes";

interface FieldOption {
  readonly value: string;
  readonly label: string;
}

/**
 * The fields an account of one type shows, defined once for every form that adds or edits an
 * account: the Accounts dialog and the Savings, Debt and Pension dialogs (system audit slice 4,
 * SD-8). A page dialog may offer fewer types, but for a given type it shows these fields.
 */
export interface AccountFieldSet {
  /** The kind select (the account subtype), or null when the type has no kinds. */
  kind: { label: string; options: readonly FieldOption[] } | null;
  /** The interest rate or growth field, with the label for this type, or null. */
  interestRate: { label: string } | null;
  /** The monthly amount (saved, paid in or paid off), with the label for this type, or null. */
  monthlyContribution: { label: string } | null;
  /** Credit limit and the 0% interest end date (Credit Card and Overdraft). */
  creditFields: boolean;
  /** Term, fixed-rate end, repayment type and the linked property (Mortgage). */
  mortgageFields: boolean;
  /** The student loan repayment plan (Student Loan). */
  studentLoanPlan: boolean;
  /** Ownership and share, where the engine allows a joint account (never an ISA or a pension). */
  joint: boolean;
}

const DEBT_RATE = { label: "Interest rate (APR) (optional)" };
const DEBT_MONTHLY = { label: "Minimum payment each month (optional)" };

const BY_TYPE: Record<string, Omit<AccountFieldSet, "joint">> = {
  Current: base(),
  Saving: base({
    kind: { label: "Kind of account (optional)", options: SAVINGS_SUBTYPE_OPTIONS },
    interestRate: { label: "Interest rate (AER)" },
    monthlyContribution: { label: "Saved each month" },
  }),
  Investment: base({
    kind: { label: "Kind of account (optional)", options: INVESTMENT_SUBTYPE_OPTIONS },
    interestRate: { label: "Estimated annual return (%)" },
    monthlyContribution: { label: "Saved each month" },
  }),
  Pension: base({
    interestRate: { label: "Assumed growth a year (optional)" },
    monthlyContribution: { label: "Extra paid in each month (optional)" },
  }),
  Property: base({
    kind: { label: "Home or rental", options: PROPERTY_SUBTYPE_OPTIONS },
  }),
  "Credit Card": base({
    interestRate: DEBT_RATE,
    monthlyContribution: DEBT_MONTHLY,
    creditFields: true,
  }),
  Overdraft: base({
    interestRate: DEBT_RATE,
    monthlyContribution: DEBT_MONTHLY,
    creditFields: true,
  }),
  Loan: base({
    kind: { label: "Kind of loan (optional)", options: LOAN_SUBTYPE_OPTIONS },
    interestRate: DEBT_RATE,
    monthlyContribution: DEBT_MONTHLY,
  }),
  Mortgage: base({
    kind: { label: "Kind of mortgage (optional)", options: MORTGAGE_SUBTYPE_OPTIONS },
    interestRate: { label: "Interest rate (optional)" },
    monthlyContribution: { label: "Monthly payment (optional)" },
    mortgageFields: true,
  }),
  "Student Loan": base({ studentLoanPlan: true }),
  Owed: base(),
};

function base(
  fields: Partial<Omit<AccountFieldSet, "joint">> = {},
): Omit<AccountFieldSet, "joint"> {
  return {
    kind: null,
    interestRate: null,
    monthlyContribution: null,
    creditFields: false,
    mortgageFields: false,
    studentLoanPlan: false,
    ...fields,
  };
}

/** The fields for an account of this type (and name and kind, which decide whether it can be joint). */
export function accountFieldSet(account: {
  type?: string | null;
  name?: string | null;
  accountSubtype?: string | null;
}): AccountFieldSet {
  const fields = BY_TYPE[account.type ?? ""] ?? base();
  return {
    ...fields,
    joint: canAccountBeJoint({
      name: account.name ?? "",
      type: account.type ?? undefined,
      accountSubtype: account.accountSubtype || null,
    }),
  };
}

/**
 * The values an edit sends: only those that differ from what the form opened with. Values are
 * compared as typed strings, so "" and "" are the same and an untouched field is never sent.
 * Two figures are the same when both are numbers of equal value ("1200" and "1200.00").
 */
export function changedFields<K extends string>(
  opened: Readonly<Record<K, string>>,
  current: Readonly<Record<K, string>>,
): Partial<Record<K, string>> {
  const changed: Partial<Record<K, string>> = {};
  for (const key of Object.keys(current) as K[]) {
    if (!sameValue(opened[key] ?? "", current[key] ?? "")) changed[key] = current[key];
  }
  return changed;
}

const sameValue = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a === "" || b === "") return false;
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && x === y;
};
