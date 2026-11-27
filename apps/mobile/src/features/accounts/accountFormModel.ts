/**
 * The account form's rules on the phone (E12 S8, plan 9.9b). Every rule web's dialog applies comes
 * from the engine's shared form logic (`@flump/finance-engine/account-form`): which fields a type
 * shows, the values a form holds, what an add or an edit sends, the debt sign rule, the share rule
 * and the mortgage link. This file adds only what the phone needs on top: the bounds web's number
 * boxes enforce as they are typed, said under the field instead, and the request body built from
 * what the engine says to send.
 */

import { Money } from "@flump/api-contract";
import {
  type AccountFieldSet,
  type AccountFormState,
  accountFieldSet,
  accountFormNeedsPlan,
  accountFormToSend,
  accountRequestFrom,
  isOwedAccountType,
} from "@flump/finance-engine/account-form";
import { ACCOUNT_FORM, FIELD_ERRORS } from "../../copy/accountForms";

/** The fields that can say what to change, keyed as the form state names them. */
export type AccountFormField =
  | "name"
  | "balance"
  | "studentLoanPlan"
  | "interestRate"
  | "monthlyContribution"
  | "sharePercent"
  | "termYears"
  | "termExtraMonths"
  | "fixedRateEndDate"
  | "creditLimit"
  | "promoZeroPercentUntil"
  | "homeValue";

export type AccountFormErrors = Partial<Record<AccountFormField, string>>;

/** What the controls could not turn into a value: text typed that is not a figure or a date. */
type UnreadFields = ReadonlySet<AccountFormField>;

const inRange = (text: string, min: number, max: number, whole = false): boolean => {
  if (text === "") return true;
  const value = Number(text);
  return (
    Number.isFinite(value) && value >= min && value <= max && (!whole || Number.isInteger(value))
  );
};

export interface ValidateInput {
  state: AccountFormState;
  /** An add needs a balance (the contract's create body requires one); an edit keeps the saved one. */
  editing: boolean;
  /** Whether ownership and share are on the form (web's partner mode rule). */
  showsJoint: boolean;
  unread: UnreadFields;
  /** Fields where a minus was typed into a box that takes none. */
  belowZero?: UnreadFields;
  /** The home's value, when its field is on the form. */
  homeValue?: number | null;
}

/** The contract's money rule (below 10 billion either way), so the phone refuses what the backend would. */
const withinLimit = (text: string): boolean => text === "" || Money.safeParse(Number(text)).success;

/**
 * What needs changing before anything is sent, field by field. Web's bounds: a rate 0 to 100, a
 * share 1 to 99 and whole, years 0 to 50, months 0 to 11. Web refuses a student loan with no plan
 * with "Choose a repayment plan". An empty object means the form can be sent.
 */
export function validateAccountForm({
  state,
  editing,
  showsJoint,
  unread,
  belowZero = new Set(),
  homeValue = null,
}: ValidateInput): AccountFormErrors {
  const set: AccountFieldSet = accountFieldSet(state);
  const owed = isOwedAccountType(state.type);
  const errors: AccountFormErrors = {};
  /** What is wrong with a typed amount, if anything: a minus, unreadable text, or over the limit. */
  const amountError = (field: AccountFormField, text: string): string | undefined => {
    if (belowZero.has(field)) {
      return field === "balance" && owed ? FIELD_ERRORS.owedBelowZero : FIELD_ERRORS.belowZero;
    }
    if (unread.has(field)) return FIELD_ERRORS.amount;
    if (!withinLimit(text)) return FIELD_ERRORS.tooLarge;
    return undefined;
  };
  if (state.name.trim() === "") errors.name = FIELD_ERRORS.name;
  const balanceError = amountError("balance", state.balance);
  if (balanceError) errors.balance = balanceError;
  else if (!editing && state.balance === "")
    errors.balance = owed ? FIELD_ERRORS.owed : FIELD_ERRORS.balance;
  if (accountFormNeedsPlan(state)) errors.studentLoanPlan = ACCOUNT_FORM.planRequired;
  if (set.interestRate && (unread.has("interestRate") || !inRange(state.interestRate, 0, 100))) {
    errors.interestRate = FIELD_ERRORS.rate;
  }
  const monthlyError = set.monthlyContribution
    ? amountError("monthlyContribution", state.monthlyContribution)
    : undefined;
  if (monthlyError) errors.monthlyContribution = monthlyError;
  if (
    showsJoint &&
    set.joint &&
    state.ownership === "joint" &&
    (unread.has("sharePercent") ||
      state.sharePercent === null ||
      !inRange(String(state.sharePercent), 1, 99, true))
  ) {
    errors.sharePercent = FIELD_ERRORS.share;
  }
  if (set.mortgageFields) {
    if (unread.has("termYears") || !inRange(state.termYears, 0, 50, true)) {
      errors.termYears = FIELD_ERRORS.years;
    }
    if (unread.has("termExtraMonths") || !inRange(state.termExtraMonths, 0, 11, true)) {
      errors.termExtraMonths = FIELD_ERRORS.months;
    }
    if (unread.has("fixedRateEndDate")) errors.fixedRateEndDate = FIELD_ERRORS.date;
    const homeError = amountError("homeValue", homeValue === null ? "" : String(homeValue));
    if (homeError) errors.homeValue = homeError;
  }
  if (set.creditFields) {
    const limitError = amountError("creditLimit", state.creditLimit);
    if (limitError) errors.creditLimit = limitError;
    if (unread.has("promoZeroPercentUntil")) errors.promoZeroPercentUntil = FIELD_ERRORS.date;
  }
  return errors;
}

/** The request, as web's action builds it (the engine's `accountRequestFrom`). */
export type AccountRequest = ReturnType<typeof accountRequestFrom>;

export interface BuildInput {
  editing: boolean;
  opened: AccountFormState;
  current: AccountFormState;
  /** The property the mortgage is on, after the engine's one-property preselection. */
  linkedAccountId: string;
  /** Adding a mortgage with no property to link: the home's value, when the field is shown. */
  homeValue: number | null;
  /** Whether the home value field is on the form (`mortgageLinkChoices().showHomeValue`). */
  showHomeValue: boolean;
}

/**
 * The body to send: what the dialog would post (`accountFormToSend`), turned into the request web's
 * action makes from it (`accountRequestFrom`). An edit with nothing changed sends nothing.
 */
export function buildAccountRequest(input: BuildInput): AccountRequest {
  const toSend = accountFormToSend({
    editing: input.editing,
    opened: input.opened,
    current: input.current,
    linkedAccountId: input.linkedAccountId,
  });
  // Web posts the home value only while its field shows and holds a figure above 0.
  const homeValue =
    input.showHomeValue && input.homeValue !== null && input.homeValue > 0 ? input.homeValue : null;
  return accountRequestFrom({
    editing: input.editing,
    get: (key) => toSend[key] ?? null,
    homeValue,
  });
}
