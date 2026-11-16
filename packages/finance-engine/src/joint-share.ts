import { categorizeAccountType, isLiabilityCategory } from "./account-category.js";
import { roundPence } from "./uk-tax-year.js";

/** Ownership mode for an account, debt, mortgage or property item (E34 Slice 1). */
export type AccountOwnership = "sole" | "joint";

/** Effective share percentage for a sole-owned or individual-only account. */
export const DEFAULT_SOLE_SHARE_PERCENT = 100;

/** Default 50/50 split when an eligible account is marked joint without a custom percentage. */
export const DEFAULT_JOINT_SHARE_PERCENT = 50;

/**
 * Neutral factual UK joint-debt notice (E34 Section 2 & Section 5).
 * Displayed once when a mortgage or debt is marked joint.
 */
export const JOINT_LIABILITY_NOTICE =
  "Each borrower on a joint mortgage or loan is legally liable for the whole debt. Your share is how you choose to count it in your figures.";

/** Account shape accepted by the E34 Slice 1 joint-share helpers. */
export interface AccountShareInput {
  type?: string | null;
  rawType?: string | null;
  name?: string | null;
  /**
   * The subtype the user chose (`cash_isa`, `easy_access`, ...). When set it decides whether the
   * account is an ISA, ahead of the type and the free-text name.
   */
  accountSubtype?: string | null;
  isIsa?: boolean | null;
  isLiability?: boolean | null;
  ownership?: AccountOwnership | string | null;
  sharePercent?: number | string | null;
  sharePct?: number | string | null;
  share_pct?: number | string | null;
}

/** Account subtypes that are ISAs (the contract's `ACCOUNT_SUBTYPES`). */
export const ISA_ACCOUNT_SUBTYPES: ReadonlySet<string> = new Set([
  "cash_isa",
  "lifetime_isa",
  "stocks_and_shares_isa",
]);

/** Account types: `ISA`, `JISA`, `LISA`, `CASH_ISA` and the like, in any case. */
const ISA_PATTERN = /\b(?:j?isa|lisa)\b/i;
/**
 * Account names are free text, so "Lisa" is more often a person than a Lifetime ISA: a name reads
 * as an ISA on "ISA" or "JISA" in any case ("Cash ISA", "Lifetime ISA", "Junior ISA"), and on
 * "LISA" only in capitals.
 */
const ISA_NAME_PATTERN = /\bj?isa\b/i;
const LISA_NAME_PATTERN = /\bLISA\b/;
const PENSION_PATTERN = /\b(?:pensions?|sipp)\b/i;
const LIABILITY_PATTERN =
  /\b(?:mortgages?|loans?|credit cards?|overdrafts?|car finance|bnpl|debts?)\b/i;
const STUDENT_LOAN_PATTERN = /\bstudent loans?\b/i;

function normalizeInput(input?: AccountShareInput | string | null): AccountShareInput {
  if (!input) return {};
  if (typeof input === "string") return { type: input };
  return input;
}

function normalizeTokens(text?: string | null): string {
  return typeof text === "string" ? text.replace(/[_-]+/g, " ").trim() : "";
}

function resolveRawType(input: AccountShareInput): string {
  const type = typeof input.type === "string" ? input.type.trim() : "";
  if (type) return type;
  return typeof input.rawType === "string" ? input.rawType.trim() : "";
}

/**
 * True when the account is an Individual Savings Account (ISA, Cash ISA, Stocks & Shares ISA,
 * Lifetime ISA, Junior ISA, `CASH_ISA`, `STOCKS_ISA`, or flagged `isIsa: true`). A chosen
 * `accountSubtype` decides it; without one it checks both the account type and account name because stored Flump accounts use `type: "Saving" | "Investment"`
 * with ISA in the name. Under UK tax rules an ISA can never be held jointly.
 */
export function isIsaAccount(input?: AccountShareInput | string | null): boolean {
  const normalized = normalizeInput(input);
  if (normalized.isIsa === true) return true;
  const subtype =
    typeof normalized.accountSubtype === "string" ? normalized.accountSubtype.trim() : "";
  // A chosen subtype is the user's own answer, so it wins over a guess from the type or name.
  if (subtype) return ISA_ACCOUNT_SUBTYPES.has(subtype);
  const rawType = normalizeTokens(resolveRawType(normalized));
  if (rawType && ISA_PATTERN.test(rawType)) return true;
  const name = normalizeTokens(normalized.name);
  return Boolean(name && (ISA_NAME_PATTERN.test(name) || LISA_NAME_PATTERN.test(name)));
}

/**
 * True when the account is a pension (Pension, SIPP, Workplace Pension, `PENSION_WORKPLACE`,
 * `PENSION_SIPP`). Under UK rules pensions are always individual and can never be held jointly.
 */
export function isPensionAccount(input?: AccountShareInput | string | null): boolean {
  const normalized = normalizeInput(input);
  const rawType = resolveRawType(normalized);
  if (!rawType) return false;
  return (
    PENSION_PATTERN.test(normalizeTokens(rawType)) || categorizeAccountType(rawType) === "pensions"
  );
}

/**
 * Whether an account can legally be held jointly under UK tax and product rules (E34 Section 2).
 * ISAs and pensions are individual-only and always return `false`. Current accounts, savings
 * accounts, general investments, mortgages, loans, credit cards and property return `true`.
 */
export function canAccountBeJoint(input?: AccountShareInput | string | null): boolean {
  if (isIsaAccount(input) || isPensionAccount(input)) {
    return false;
  }
  return true;
}

/**
 * Effective ownership for an account. Individual-only accounts (ISAs and pensions) always resolve
 * to `"sole"` even if a caller passes `ownership: "joint"`.
 */
export function resolveAccountOwnership(input?: AccountShareInput | null): AccountOwnership {
  if (!input || !canAccountBeJoint(input)) {
    return "sole";
  }
  const rawOwnership =
    typeof input.ownership === "string" ? input.ownership.trim().toLowerCase() : "";
  return rawOwnership === "joint" ? "joint" : "sole";
}

function parseRawSharePercent(input: AccountShareInput): number | null {
  const raw = input.sharePercent ?? input.sharePct ?? input.share_pct;
  if (raw === null || raw === undefined || raw === "") return null;
  const num = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(num) ? num : null;
}

/**
 * Effective percentage share (`0 < share <= 100`) to count for this person's financial picture:
 * - `100` for `"sole"` accounts or accounts that cannot be joint (ISAs and pensions).
 * - `50` by default when an eligible account is marked `"joint"` without a valid positive share.
 * - Clamped to `100` when a joint share above `100` is supplied.
 */
export function resolveAccountSharePercent(input?: AccountShareInput | null): number {
  if (resolveAccountOwnership(input) !== "joint" || !input) {
    return DEFAULT_SOLE_SHARE_PERCENT;
  }
  const parsed = parseRawSharePercent(input);
  if (parsed === null || parsed <= 0) {
    return DEFAULT_JOINT_SHARE_PERCENT;
  }
  if (parsed > 100) {
    return DEFAULT_SOLE_SHARE_PERCENT;
  }
  return parsed;
}

function roundSignedPence(value: number): number {
  if (value === 0) return 0;
  const rounded = value < 0 ? -roundPence(-value) : roundPence(value);
  return rounded + 0;
}

/**
 * Scales a balance, monthly payment, or interest figure by the person's effective account share
 * (`resolveAccountSharePercent(input) / 100`), rounded symmetrically to pence.
 */
export function applyAccountShare(amount: number, input?: AccountShareInput | null): number {
  if (!Number.isFinite(amount) || amount === 0) {
    return 0;
  }
  const sharePercent = resolveAccountSharePercent(input);
  if (sharePercent === 100) {
    return amount;
  }
  return roundSignedPence(amount * (sharePercent / 100));
}

/**
 * Computes a person's taxable share of annual savings interest for Personal Savings Allowance
 * calculations (E34 Section 2).
 *
 * - Interest inside an ISA (or pension) is tax-free under UK rules and returns `0`.
 * - Joint non-ISA savings interest defaults to a 50/50 split (`50%`), overridable via `sharePercent`.
 * - Sole non-ISA savings interest counts at `100%`.
 */
export function splitJointSavingsInterest(
  annualInterest: number,
  input?: AccountShareInput | null,
): number {
  if (!Number.isFinite(annualInterest) || annualInterest <= 0) {
    return 0;
  }
  if (isIsaAccount(input) || isPensionAccount(input)) {
    return 0;
  }
  return applyAccountShare(annualInterest, input);
}

function isLiabilityAccount(input: AccountShareInput): boolean {
  if (input.isLiability === true) return true;
  if (input.isLiability === false) return false;
  const rawType = resolveRawType(input);
  if (!rawType) return false;
  const normalized = normalizeTokens(rawType);
  if (STUDENT_LOAN_PATTERN.test(normalized)) return false;
  const category = categorizeAccountType(rawType);
  if (isLiabilityCategory(category)) return true;
  return LIABILITY_PATTERN.test(normalized);
}

/**
 * Returns the neutral factual UK joint-debt liability notice when a mortgage or debt account is
 * marked joint, or `null` for sole accounts and asset accounts (E34 Section 2 & Section 5).
 */
export function describeJointLiabilityNotice(input?: AccountShareInput | null): string | null {
  if (!input || resolveAccountOwnership(input) !== "joint") {
    return null;
  }
  if (!isLiabilityAccount(input)) {
    return null;
  }
  return JOINT_LIABILITY_NOTICE;
}
