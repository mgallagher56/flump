import { calculateMonthlyMortgagePayment } from "../../mortgage.js";
import type { PortfolioSnapshot, RawAccount } from "../../portfolio.js";
import { type Figure, type FigureProvenance, figureKnown, figureUnknown } from "../figure.js";
import type { MissingKey, ProfileFacts } from "../input.js";
import type { TakeHome } from "./take-home.js";

/** What one month of housing costs, and its share of take-home pay. Facts only: no benchmark. */
export interface HousingCost {
  /** "household": living with family or friends, paying what they choose towards the household. */
  kind: "rent" | "mortgage" | "household";
  /** Pounds a month. Above 0 when known, except "household", where £0 is a real answer. */
  monthly: number;
  /** The take-home monthly figure the share is taken from. */
  takeHomeMonthly: number;
  /** monthly / takeHomeMonthly x 100, to one decimal place. */
  sharePct: number;
  /** True when the payment is estimated from stored balance, rate and term. */
  paymentEstimated: boolean;
}

export const MORTGAGE_ESTIMATE_NOTE = "Repayment mortgage at your saved rate.";

const round2 = (n: number): number => Math.round(n * 100) / 100;

function positive(value: unknown): number | null {
  const n = Number(value);
  return value !== null && value !== undefined && Number.isFinite(n) && n > 0 ? n : null;
}

/** Payments for every mortgage account, or null when any one lacks a balance, rate or term. */
function estimateMortgagePayments(
  snapshot: PortfolioSnapshot,
  rawAccounts: readonly RawAccount[],
): number | null {
  const mortgages = rawAccounts.filter((a) => a.type === "Mortgage");
  if (mortgages.length === 0) return null;
  let total = 0;
  for (const account of mortgages) {
    const balance = account.id ? snapshot.getLatestBalance(account.id) : 0;
    const rate = positive(account.interestRate);
    const term = positive(account.termMonths);
    // The mortgage page treats a 0% rate as not stored; the estimate agrees with it.
    if (!(balance > 0) || rate === null || term === null) return null;
    const payment = calculateMonthlyMortgagePayment(balance, rate, term);
    // A vanishingly small rate can make the formula divide by zero: treat that as not stored.
    if (!Number.isFinite(payment) || payment <= 0) return null;
    total += payment;
  }
  return total > 0 ? round2(total) : null;
}

/**
 * Housing cost and its share of take-home pay (E32). Reads saved facts only and never budget
 * rows, so a rent recorded as a budget row is not counted twice. Unknown, never 0, when either
 * side is missing.
 */
export function selectHousingCost(
  profile: ProfileFacts,
  takeHome: Figure<TakeHome>,
  snapshot: PortfolioSnapshot,
  rawAccounts: readonly RawAccount[],
): Figure<HousingCost> {
  const missing: MissingKey[] = [];
  const saved = positive(profile.monthlyHousingCost);
  let kind: HousingCost["kind"] = "rent";
  let monthly: number | null = null;
  let paymentEstimated = false;

  if (profile.housingStatus === "renting") {
    monthly = saved;
    if (monthly === null) missing.push("monthlyHousingCost");
  } else if (profile.housingStatus === "mortgage") {
    kind = "mortgage";
    const estimate =
      profile.mortgageType === "interest-only"
        ? null
        : estimateMortgagePayments(snapshot, rawAccounts);
    if (estimate !== null) {
      monthly = estimate;
      paymentEstimated = true;
    } else {
      monthly = saved;
      if (monthly === null) missing.push("mortgageDetails");
    }
  } else if (profile.housingStatus === "living_with_family") {
    // The amount is optional and £0 is valid: an empty amount means nothing is paid.
    kind = "household";
    monthly = saved ?? 0;
  } else {
    missing.push("housingStatus");
  }

  if (takeHome.status === "unknown") {
    for (const key of takeHome.missing) if (!missing.includes(key)) missing.push(key);
    return figureUnknown(missing, takeHome.reason ?? "not-set");
  }
  if (missing.length > 0 || monthly === null) return figureUnknown(missing, "not-set");
  const takeHomeMonthly = takeHome.value.monthly;
  if (!(takeHomeMonthly > 0)) return figureUnknown(["annualSalary"], "not-set");

  const assumptions = [...(takeHome.assumptions ?? [])];
  if (paymentEstimated) assumptions.push(MORTGAGE_ESTIMATE_NOTE);
  const provenance: FigureProvenance = assumptions.length > 0 ? "assumption" : "user";

  return figureKnown<HousingCost>(
    {
      kind,
      monthly,
      takeHomeMonthly,
      sharePct: Math.round((monthly / takeHomeMonthly) * 1000) / 10,
      paymentEstimated,
    },
    provenance,
    assumptions,
  );
}

export interface FixedRateEndFact {
  /** YYYY-MM-DD, as stored. */
  date: string;
  /** Whole calendar months from asOf to the end date, never below 0. */
  monthsRemaining: number;
  /** True once the end date is before asOf's calendar day. */
  ended: boolean;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The fix-end fact for one stored date. Null for a missing or malformed date. */
export function fixedRateEnd(
  isoDate: string | null | undefined,
  asOf: Date = new Date(),
): FixedRateEndFact | null {
  if (typeof isoDate !== "string") return null;
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null;
  }
  const ay = asOf.getUTCFullYear();
  const am = asOf.getUTCMonth() + 1;
  const ad = asOf.getUTCDate();
  const months = (y - ay) * 12 + (m - am) - (d < ad ? 1 : 0);
  const ended = y * 10000 + m * 100 + d < ay * 10000 + am * 100 + ad;
  return { date: isoDate, monthsRemaining: Math.max(0, months), ended };
}

export interface AccountFixedRateEnd extends FixedRateEndFact {
  accountId: string;
}

/** Fix-end facts for every mortgage account with a valid stored date. */
export function selectFixedRateEnds(
  rawAccounts: readonly RawAccount[],
  asOf: Date = new Date(),
): AccountFixedRateEnd[] {
  const out: AccountFixedRateEnd[] = [];
  for (const account of rawAccounts) {
    if (account.type !== "Mortgage" || !account.id) continue;
    const fact = fixedRateEnd(account.fixedRateEndDate, asOf);
    if (fact) out.push({ accountId: String(account.id), ...fact });
  }
  return out;
}
