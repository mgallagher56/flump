/**
 * The add and edit account form, shared by web's Accounts dialog and the mobile app (E12 S8): the
 * types and their fields, the kinds, the form's state and the values it posts, the changed-fields
 * rule for an edit, the sign rule for a debt, the share rule and the body a route reads back.
 * Moved from `apps/web` with no change to what is sent (`accountFormSave.characterisation.test`).
 */

import { isOwedAccountType } from "./account-balance.js";
import { BUY_TO_LET_PROPERTY_LABEL, isBuyToLetAccount } from "./buy-to-let.js";
import {
  type AccountOwnership,
  canAccountBeJoint,
  DEFAULT_JOINT_SHARE_PERCENT,
} from "./joint-share.js";
import { HOME_ESTIMATE_LABEL } from "./picture/selectors/portfolio-totals.js";

// ---------------------------------------------------------------------------------------------
// Types and options
// ---------------------------------------------------------------------------------------------

/** The account types the form offers, in the order the type select lists them. */
export const ACCOUNT_FORM_TYPES = [
  "Current",
  "Saving",
  "Investment",
  "Pension",
  "Property",
  "Credit Card",
  "Overdraft",
  "Mortgage",
  "Loan",
  "Student Loan",
  "Owed",
] as const;

export const SAVINGS_SUBTYPE_OPTIONS = [
  { value: "easy_access", label: "Easy access savings" },
  { value: "notice", label: "Notice savings" },
  { value: "regular_saver", label: "Regular saver" },
  { value: "fixed_term", label: "Fixed term savings" },
  { value: "general_savings", label: "General savings" },
  { value: "cash_isa", label: "Cash ISA" },
  { value: "lifetime_isa", label: "Lifetime ISA (LISA)" },
] as const;

export const INVESTMENT_SUBTYPE_OPTIONS = [
  { value: "stocks_and_shares_isa", label: "Stocks and shares ISA" },
  { value: "general_investment", label: "General investment account" },
] as const;

export const MORTGAGE_SUBTYPE_OPTIONS = [
  { value: "residential_mortgage", label: "Residential mortgage" },
  { value: "btl_mortgage", label: "Buy-to-let (BTL) mortgage" },
] as const;

/** Property kinds (system audit slice 4, L71): the home, or a property let out. */
export const PROPERTY_SUBTYPE_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "rental", label: "Rental property" },
] as const;

/** Loan kinds (system audit slice 4): labels only, no figure reads them. */
export const LOAN_SUBTYPE_OPTIONS = [
  { value: "car_finance", label: "Car finance or HP" },
  { value: "buy_now_pay_later", label: "Buy now, pay later" },
  { value: "other_loan", label: "Personal or other loan" },
] as const;

/** How a mortgage is repaid, stored on the Mortgage account. */
export const MORTGAGE_REPAYMENT_OPTIONS = [
  { value: "repayment", label: "Repayment" },
  { value: "interest-only", label: "Interest only" },
] as const;

/** Student loan repayment plans (stored values, matches the backend allow-list). */
export const STUDENT_LOAN_PLAN_OPTIONS = [
  { value: "PLAN_1", label: "Plan 1" },
  { value: "PLAN_2", label: "Plan 2" },
  { value: "PLAN_4", label: "Plan 4 (Scotland)" },
  { value: "PLAN_5", label: "Plan 5" },
  { value: "POSTGRAD", label: "Postgraduate" },
] as const;

export const OWNERSHIP_OPTIONS = [
  { value: "sole", label: "Sole (yours only)" },
  { value: "joint", label: "Joint" },
] as const;

/** The label of each stored kind, for lists and pages that show it. */
export const ACCOUNT_SUBTYPE_LABEL: Record<string, string> = Object.fromEntries(
  [
    ...SAVINGS_SUBTYPE_OPTIONS,
    ...INVESTMENT_SUBTYPE_OPTIONS,
    ...MORTGAGE_SUBTYPE_OPTIONS,
    ...PROPERTY_SUBTYPE_OPTIONS,
    ...LOAN_SUBTYPE_OPTIONS,
  ].map((o) => [o.value, o.label]),
);

// ---------------------------------------------------------------------------------------------
// The field set
// ---------------------------------------------------------------------------------------------

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

const sameValue = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a === "" || b === "") return false;
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && x === y;
};

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

// ---------------------------------------------------------------------------------------------
// The sign rule and the share rule
// ---------------------------------------------------------------------------------------------

/**
 * Liabilities are stored as minus the amount owed, but the form shows the positive amount owed,
 * as the rest of the app does. The balance the form shows for a stored one.
 */
export function accountBalanceShown(
  type: string | null | undefined,
  stored: number | null | undefined,
): string {
  if (stored === undefined || stored === null) return "";
  return String(isOwedAccountType(type) ? Math.abs(stored) : stored);
}

/** The figure to send: a liability goes back as minus the amount owed, which is what is stored. */
export function accountBalanceStored(type: string | null | undefined, shown: string): string {
  if (shown === "" || !isOwedAccountType(type)) return shown;
  const owed = Math.abs(Number(shown));
  return owed === 0 ? "0" : String(-owed);
}

/** The share to save: 1 to 99, whole, for a joint account; null for a sole one. */
export function resolveSharePercent(
  ownership: AccountOwnership,
  sharePercent: number | null,
): number | null {
  return ownership === "joint"
    ? Math.min(99, Math.max(1, Math.round(sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT)))
    : null;
}

// ---------------------------------------------------------------------------------------------
// The form's state and the values it posts
// ---------------------------------------------------------------------------------------------

/** Every field the form holds, as typed. The balance is the shown figure (owed, for a debt). */
export interface AccountFormState {
  name: string;
  type: string;
  accountSubtype: string;
  balance: string;
  interestRate: string;
  monthlyContribution: string;
  studentLoanPlan: string;
  creditLimit: string;
  promoZeroPercentUntil: string;
  termYears: string;
  termExtraMonths: string;
  fixedRateEndDate: string;
  repaymentType: string;
  linkedAccountId: string;
  ownership: AccountOwnership;
  sharePercent: number | null;
}

/** A saved account, as stored, that the edit form opens with. */
export interface SavedAccountForForm {
  id?: string;
  name?: string;
  type?: string;
  accountSubtype?: string | null;
  balance?: number;
  interestRate?: number | null;
  monthlyContribution?: number | null;
  creditLimit?: number | null;
  promoZeroPercentUntil?: string | null;
  studentLoanPlan?: string | null;
  termMonths?: number | null;
  fixedRateEndDate?: string | null;
  repaymentType?: string | null;
  linkedAccountId?: string | null;
  ownership?: AccountOwnership | string | null;
  sharePercent?: number | null;
  /** The saved account's version, sent with an edit so a change made elsewhere is not overwritten. */
  updatedAt?: string;
}

/** What the add form may open with (for example "Add an estimate": a Property called "Home"). */
export interface AccountFormPrefill {
  initialName?: string;
  initialType?: string;
  initialSubtype?: string;
  initialOwnership?: AccountOwnership;
  initialSharePercent?: number | null;
}

const numberText = (value: number | null | undefined): string =>
  value === undefined || value === null || !Number.isFinite(Number(value)) ? "" : String(value);

const termParts = (months: number | null | undefined): [string, string] => {
  if (months === undefined || months === null || !Number.isFinite(Number(months))) return ["", ""];
  const whole = Math.round(Number(months));
  return [String(Math.floor(whole / 12)), String(whole % 12)];
};

/** The edit form's state for a saved account. */
export function accountFormFromSaved(account: SavedAccountForForm): AccountFormState {
  const [termYears, termExtraMonths] = termParts(account.termMonths);
  return {
    name: account.name || "",
    type: account.type || ACCOUNT_FORM_TYPES[0],
    accountSubtype: account.accountSubtype || "",
    balance: accountBalanceShown(account.type, account.balance),
    interestRate: numberText(account.interestRate),
    monthlyContribution: numberText(account.monthlyContribution),
    studentLoanPlan: account.studentLoanPlan || "",
    creditLimit: numberText(account.creditLimit),
    promoZeroPercentUntil: account.promoZeroPercentUntil || "",
    termYears,
    termExtraMonths,
    fixedRateEndDate: account.fixedRateEndDate || "",
    repaymentType: account.repaymentType || "",
    linkedAccountId: account.linkedAccountId || "",
    ownership: account.ownership === "joint" ? "joint" : "sole",
    sharePercent: account.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT,
  };
}

/** The add form's state: empty, or what the prefill gives. */
export function newAccountForm(prefill: AccountFormPrefill = {}): AccountFormState {
  return {
    name: prefill.initialName ?? "",
    type: prefill.initialType ?? ACCOUNT_FORM_TYPES[0],
    accountSubtype: prefill.initialSubtype ?? "",
    balance: "",
    interestRate: "",
    monthlyContribution: "",
    studentLoanPlan: "",
    creditLimit: "",
    promoZeroPercentUntil: "",
    termYears: "",
    termExtraMonths: "",
    fixedRateEndDate: "",
    repaymentType: "",
    linkedAccountId: "",
    ownership: prefill.initialOwnership === "joint" ? "joint" : "sole",
    sharePercent: prefill.initialSharePercent ?? DEFAULT_JOINT_SHARE_PERCENT,
  };
}

/** Whole months from the typed years and months, or "" when neither is typed or it is 0. */
const termMonthsText = (years: string, months: string): string => {
  if (years === "" && months === "") return "";
  const total = Number(years || 0) * 12 + Number(months || 0);
  return Number.isFinite(total) && total > 0 ? String(Math.round(total)) : "";
};

/**
 * The values the form would post, by field. A field the account's type does not show is empty, so
 * an edit that changes the type clears what the new type does not take. The balance is the shown
 * figure here; it is converted to the stored one only when it is sent.
 */
export function accountFormValues(state: AccountFormState): Record<string, string> {
  const set = accountFieldSet({
    type: state.type,
    name: state.name,
    accountSubtype: state.accountSubtype,
  });
  const ownership: AccountOwnership = set.joint && state.ownership === "joint" ? "joint" : "sole";
  const share = resolveSharePercent(ownership, state.sharePercent);
  return {
    name: state.name,
    type: state.type,
    accountSubtype: set.kind ? state.accountSubtype : "",
    balance: state.balance,
    interestRate: set.interestRate ? state.interestRate : "",
    monthlyContribution: set.monthlyContribution ? state.monthlyContribution : "",
    studentLoanPlan: set.studentLoanPlan ? state.studentLoanPlan : "",
    creditLimit: set.creditFields ? state.creditLimit : "",
    promoZeroPercentUntil: set.creditFields ? state.promoZeroPercentUntil : "",
    termMonths: set.mortgageFields ? termMonthsText(state.termYears, state.termExtraMonths) : "",
    fixedRateEndDate: set.mortgageFields ? state.fixedRateEndDate : "",
    repaymentType: set.mortgageFields ? state.repaymentType : "",
    linkedAccountId: set.mortgageFields ? state.linkedAccountId : "",
    ownership,
    sharePercent: share === null ? "" : String(share),
  };
}

/** A student loan cannot be saved without its repayment plan. */
export function accountFormNeedsPlan(state: AccountFormState): boolean {
  return accountFieldSet(state).studentLoanPlan && !state.studentLoanPlan;
}

// ---------------------------------------------------------------------------------------------
// The mortgage's property
// ---------------------------------------------------------------------------------------------

/** An account the mortgage could be linked to, as listed by the accounts read. */
interface LinkCandidate {
  id?: string;
  name?: string;
  type?: string;
  accountSubtype?: string | null;
}

export interface MortgageLinkChoices {
  /** The properties this mortgage can be on, for the link select. */
  linkable: { id: string; name: string }[];
  /** Whether the link select shows. */
  showLinkSelect: boolean;
  /** Adding a mortgage with no property to link asks what the home is worth instead. */
  showHomeValue: boolean;
  /** The property chosen: the one property when adding and nothing has been chosen. */
  linkedAccountId: string;
  /** The mortgage is buy to let, so its property is a rental. */
  propertyIsRental: boolean;
}

/**
 * Which properties a mortgage can be on, and what the form asks. A mortgage is on a home or, for
 * buy to let, a rental: the kind decides, else the name. Properties of that kind, and those with no
 * kind saved, are listed; the one the saved mortgage is linked to now is always listed. Adding a
 * mortgage with none to link asks for the property's value instead, and one is preselected until
 * the person chooses.
 */
export function mortgageLinkChoices(input: {
  state: AccountFormState;
  accounts: readonly LinkCandidate[];
  savedLinkedAccountId?: string | null;
  editing: boolean;
  linkTouched: boolean;
}): MortgageLinkChoices {
  const { state, accounts, savedLinkedAccountId, editing, linkTouched } = input;
  const set = accountFieldSet(state);
  const wantedKind = isBuyToLetAccount({
    name: state.name,
    accountSubtype: state.accountSubtype || null,
  })
    ? "rental"
    : "home";
  const linkable = set.mortgageFields
    ? accounts
        .filter(
          (a) =>
            a.type === "Property" &&
            a.id &&
            (!a.accountSubtype || a.accountSubtype === wantedKind || a.id === savedLinkedAccountId),
        )
        .map((a) => ({ id: a.id ?? "", name: a.name ?? "" }))
    : [];
  const adding = !editing && set.mortgageFields;
  return {
    linkable,
    showLinkSelect: set.mortgageFields && linkable.length > 0,
    showHomeValue: adding && linkable.length === 0,
    linkedAccountId:
      adding && !linkTouched && linkable.length === 1
        ? (linkable[0]?.id ?? "")
        : (accountFormValues(state).linkedAccountId as string),
    propertyIsRental: wantedKind === "rental",
  };
}

// ---------------------------------------------------------------------------------------------
// The body sent
// ---------------------------------------------------------------------------------------------

/**
 * The account fields a save sends. An add sends the fields its type shows (name, type and
 * ownership always; the kind, credit fields and plan when the type has them, even empty; anything
 * else when typed). An edit sends only what changed, and the share with a changed ownership, so a
 * share is never left behind on a sole one. The balance is compared as shown and sent as stored
 * (minus the amount owed for a debt); an empty balance or share is never sent.
 */
export function accountFormToSend(input: {
  editing: boolean;
  opened: AccountFormState;
  current: AccountFormState;
  linkedAccountId: string;
}): Record<string, string> {
  const { editing, opened, current: state, linkedAccountId } = input;
  const set = accountFieldSet(state);
  const current: Record<string, string> = { ...accountFormValues(state), linkedAccountId };
  const toSend: Record<string, string> = editing
    ? (changedFields(accountFormValues(opened), current) as Record<string, string>)
    : Object.fromEntries(
        Object.entries(current).filter(
          ([key, value]) =>
            key === "name" ||
            key === "type" ||
            key === "ownership" ||
            (key === "accountSubtype" && set.kind !== null) ||
            (key === "creditLimit" && set.creditFields) ||
            (key === "promoZeroPercentUntil" && set.creditFields) ||
            (key === "studentLoanPlan" && set.studentLoanPlan) ||
            value !== "",
        ),
      );
  if (editing && "ownership" in toSend && current.sharePercent !== "") {
    toSend.sharePercent = current.sharePercent as string;
  }
  if ("balance" in toSend) {
    const stored = accountBalanceStored(state.type, toSend.balance ?? "");
    if (stored === "") delete toSend.balance;
    else toSend.balance = stored;
  }
  if (toSend.sharePercent === "") delete toSend.sharePercent;
  return toSend;
}

// ---------------------------------------------------------------------------------------------
// Reading a posted form back
// ---------------------------------------------------------------------------------------------

/** The optional account fields the add and edit forms post, as the backend takes them. */
export interface AccountFormFields {
  ownership?: "sole" | "joint";
  sharePercent?: number | null;
  accountSubtype?: string | null;
  studentLoanPlan?: string;
  balance?: number;
  creditLimit?: number | null;
  promoZeroPercentUntil?: string | null;
  interestRate?: number | null;
  monthlyContribution?: number | null;
  /** Mortgage only: whole months, 1 to 600. */
  termMonths?: number | null;
  /** Mortgage only (YYYY-MM-DD). */
  fixedRateEndDate?: string | null;
  /** Mortgage only. */
  repaymentType?: "repayment" | "interest-only" | null;
  /** Mortgage only: the Property account it is on. */
  linkedAccountId?: string | null;
}

/** Money and percentages to 2 decimals: the API contract (E21) refuses more. */
const roundTo2dp = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** A field left out stays undefined (not sent); an empty field is null (cleared). */
const optionalText = (raw: string | null): string | null | undefined =>
  raw === null ? undefined : raw === "" ? null : raw;

const optionalMoney = (raw: string | null): number | null | undefined => {
  if (raw === null) return undefined;
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? roundTo2dp(value) : undefined;
};

const optionalTermMonths = (raw: string | null): number | null | undefined => {
  if (raw === null) return undefined;
  if (raw === "") return null;
  const value = Math.round(Number(raw));
  return Number.isFinite(value) && value >= 1 && value <= 600 ? value : undefined;
};

const optionalRepaymentType = (
  raw: string | null,
): "repayment" | "interest-only" | null | undefined => {
  if (raw === null) return undefined;
  if (raw === "") return null;
  return raw === "repayment" || raw === "interest-only" ? raw : undefined;
};

/**
 * Reads the optional account fields from posted values (`get` returns null for a field not
 * posted), so every route that adds or edits an account sends the same body. Only fields with a
 * value are returned.
 */
export function accountFieldsFromValues(get: (key: string) => string | null): AccountFormFields {
  const rawOwnership = get("ownership");
  const ownership =
    rawOwnership === "joint" ? "joint" : rawOwnership === "sole" ? "sole" : undefined;
  const rawSharePercent = get("sharePercent");
  const sharePercent =
    ownership === "sole"
      ? null
      : rawSharePercent !== null &&
          rawSharePercent !== "" &&
          Number.isFinite(Number(rawSharePercent))
        ? Math.min(100, Math.max(1, Math.round(Number(rawSharePercent))))
        : undefined;
  const rawPlan = get("studentLoanPlan");
  const studentLoanPlan = rawPlan !== null && rawPlan !== "" ? rawPlan : undefined;
  const fields: AccountFormFields = {
    ownership,
    sharePercent,
    accountSubtype: optionalText(get("accountSubtype")),
    studentLoanPlan,
    // An empty balance is left out (create defaults it, update keeps it), never cleared.
    balance: optionalMoney(get("balance")) ?? undefined,
    creditLimit: optionalMoney(get("creditLimit")),
    promoZeroPercentUntil: optionalText(get("promoZeroPercentUntil")),
    interestRate: optionalMoney(get("interestRate")),
    monthlyContribution: optionalMoney(get("monthlyContribution")),
    termMonths: optionalTermMonths(get("termMonths")),
    fixedRateEndDate: optionalText(get("fixedRateEndDate")),
    repaymentType: optionalRepaymentType(get("repaymentType")),
    linkedAccountId: optionalText(get("linkedAccountId")),
  };
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as AccountFormFields;
}

// ---------------------------------------------------------------------------------------------
// The request a save makes
// ---------------------------------------------------------------------------------------------

/** What a posted add or edit asks the backend for. */
export type AccountRequest =
  | { kind: "none" }
  | { kind: "create"; body: Record<string, unknown> }
  | {
      kind: "createWithProperty";
      body: { mortgage: Record<string, unknown>; property: { balance: number } };
    }
  | { kind: "update"; body: Record<string, unknown> };

/**
 * The request for posted account values. An add posts the name, type and fields; a mortgage added
 * with what its home is worth (above 0) and no property to link adds both together, linked, the
 * mortgage without its type. An edit sends the name and type only when posted, then the fields;
 * an edit with nothing in it is "none".
 */
export function accountRequestFrom(input: {
  editing: boolean;
  get: (key: string) => string | null;
  homeValue: number | null;
}): AccountRequest {
  const { editing, get, homeValue } = input;
  const name = get("name");
  const type = get("type");
  const fields = accountFieldsFromValues(get);
  if (editing) {
    const body: Record<string, unknown> = {
      ...(name !== null ? { name } : {}),
      ...(type !== null ? { type } : {}),
      ...fields,
    };
    return Object.keys(body).length === 0 ? { kind: "none" } : { kind: "update", body };
  }
  if (
    type === "Mortgage" &&
    homeValue !== null &&
    Number.isFinite(homeValue) &&
    homeValue > 0 &&
    !fields.linkedAccountId
  ) {
    const { linkedAccountId: _notLinked, ...mortgageFields } = fields;
    return {
      kind: "createWithProperty",
      body: { mortgage: { name, ...mortgageFields }, property: { balance: roundTo2dp(homeValue) } },
    };
  }
  return { kind: "create", body: { name, type, ...fields } };
}

// ---------------------------------------------------------------------------------------------
// The property "Add an estimate" adds
// ---------------------------------------------------------------------------------------------

export interface MortgageLike {
  id?: string | null;
  type?: string | null;
  name?: string | null;
  accountSubtype?: string | null;
  linkedAccountId?: string | null;
  ownership?: string | null;
  sharePercent?: number | null;
  updatedAt?: string | null;
}

/** What the "add property" dialog starts with: the property's kind, name and suggested share. */
export interface PropertyPrefill {
  name: string;
  subtype: "home" | "rental";
  ownership: AccountOwnership;
  sharePercent: number | null;
  linkMortgage?: { id: string; updatedAt?: string };
}

/**
 * The property "Add an estimate" adds (JO-6): for the one mortgage with no property linked (a
 * residential one first, else a buy-to-let one), a home or a rental with that mortgage's ownership
 * and share as a suggestion (decision 14 B), linked to it once saved. With no such mortgage, or
 * more than one that could be it, a home held solely and linked to nothing.
 */
export const propertyPrefillFor = (accounts: readonly MortgageLike[]): PropertyPrefill => {
  const unlinked = accounts.filter((a) => a.type === "Mortgage" && a.id && !a.linkedAccountId);
  const residential = unlinked.filter((a) => !isBuyToLetAccount(a));
  const candidates = residential.length > 0 ? residential : unlinked;
  const mortgage = candidates.length === 1 ? candidates[0] : undefined;
  if (!mortgage?.id) {
    return { name: HOME_ESTIMATE_LABEL, subtype: "home", ownership: "sole", sharePercent: null };
  }
  const rental = isBuyToLetAccount(mortgage);
  const joint = mortgage.ownership === "joint";
  return {
    name: rental ? BUY_TO_LET_PROPERTY_LABEL : HOME_ESTIMATE_LABEL,
    subtype: rental ? "rental" : "home",
    ownership: joint ? "joint" : "sole",
    sharePercent: joint ? (mortgage.sharePercent ?? null) : null,
    linkMortgage: {
      id: mortgage.id,
      ...(mortgage.updatedAt ? { updatedAt: mortgage.updatedAt } : {}),
    },
  };
};
