import { categorizeAccountType, isLiabilityCategory } from "./account-category.js";

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
  isIsa?: boolean | null;
  isLiability?: boolean | null;
  ownership?: AccountOwnership | string | null;
  sharePercent?: number | string | null;
  sharePct?: number | string | null;
  share_pct?: number | string | null;
}

const ISA_TYPE_PATTERN = /\b(isa|lisa)\b/i;
const PENSION_TYPE_PATTERN = /\b(pensions?|sipp)\b/i;
const LIABILITY_TYPE_PATTERN =
  /\b(mortgages?|loans?|loan_personal|credit[_ ]cards?|overdrafts?|car[_ ]finance|bnpl|debts?)\b/i;
const STUDENT_LOAN_TYPE_PATTERN = /\bstudent[_ ]loans?\b/i;

function normalizeInput(input?: AccountShareInput | string | null): AccountShareInput {
  if (!input) return {};
  if (typeof input === "string") return { type: input };
  return input;
}

function resolveRawType(input: AccountShareInput): string {
  const raw = input.type ?? input.rawType ?? "";
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * True when the account is an Individual Savings Account (ISA, Cash ISA, Stocks & Shares ISA,
 * Lifetime ISA, or flagged `isIsa: true`). Under UK tax rules an ISA can never be held jointly.
 */
export function isIsaAccount(input?: AccountShareInput | string | null): boolean {
  const normalized = normalizeInput(input);
  if (normalized.isIsa === true) return true;
  const rawType = resolveRawType(normalized);
  if (!rawType) return false;
  return ISA_TYPE_PATTERN.test(rawType);
}

/**
 * True when the account is a pension (Pension, SIPP, Workplace Pension). Under UK rules pensions
 * are always individual and can never be held jointly.
 */
export function isPensionAccount(input?: AccountShareInput | string | null): boolean {
  const normalized = normalizeInput(input);
  const rawType = resolveRawType(normalized);
  if (!rawType) return false;
  return PENSION_TYPE_PATTERN.test(rawType) || categorizeAccountType(rawType) === "pensions";
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

function roundPence(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}

/**
 * Scales a balance, monthly payment, or interest figure by the person's effective account share
 * (`resolveAccountSharePercent(input) / 100`), rounded to pence.
 */
export function applyAccountShare(amount: number, input?: AccountShareInput | null): number {
  if (!Number.isFinite(amount) || amount === 0) {
    return 0;
  }
  const sharePercent = resolveAccountSharePercent(input);
  if (sharePercent === 100) {
    return amount;
  }
  return roundPence(amount * (sharePercent / 100));
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
  if (STUDENT_LOAN_TYPE_PATTERN.test(rawType)) return false;
  const category = categorizeAccountType(rawType);
  if (isLiabilityCategory(category)) return true;
  return LIABILITY_TYPE_PATTERN.test(rawType);
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
