import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { BUDGET_HOUSING_CATEGORY } from "../../budget-entry-names.js";
import { applyBudgetEntryShare } from "../../budget-entry-share.js";
import { isBuyToLetAccount } from "../../buy-to-let.js";
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

/**
 * The monthly payment for every mortgage on the home, at the person's share, or null when any one
 * has neither a saved payment nor a balance, rate and term to estimate it from (audit slice 5,
 * HM-1): the payment saved on the mortgage account (the Mortgage page writes it) comes first, so
 * changing it there changes the budget's housing line, commitments and Retirement. A mortgage
 * with no saved payment is estimated as a repayment mortgage, unless the account's own repayment
 * type is interest-only (no repayment formula fits it). An account with no type set is read as
 * repayment, the type every account form starts on; the profile's old mortgage answer is no longer
 * read (system audit leftovers, item 3: a migration copied it onto the sole residential mortgage
 * account). A buy-to-let mortgage is the rental's cost, not housing, so it is left out (system audit slice 4):
 * it neither adds to the figure nor makes it unknown.
 */
function homeMortgagePayments(
  snapshot: PortfolioSnapshot,
  rawAccounts: readonly RawAccount[],
): { monthly: number; estimated: boolean } | null {
  const mortgages = rawAccounts.filter((a) => a.type === "Mortgage" && !isBuyToLetAccount(a));
  if (mortgages.length === 0) return null;
  const resolved = new Map(snapshot.getResolvedAccounts().map((a) => [a.id, a]));
  let total = 0;
  let estimated = false;
  for (const account of mortgages) {
    // The saved payment, already at the person's share of a joint mortgage.
    const saved = account.id ? resolved.get(String(account.id)) : undefined;
    if (saved?.monthlyContributionKnown && saved.monthlyContribution > 0) {
      total += saved.monthlyContribution;
      continue;
    }
    if (account.repaymentType === "interest-only") return null;
    estimated = true;
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
  return total > 0 ? { monthly: round2(total), estimated } : null;
}

/**
 * The person's share of a rent (audit slice 5, JO-8). The saved rent is the whole rent for the
 * home; the budget's linked housing line carries whether it is shared and the person's share (its
 * ownership and share, as every budget line has). Sole, or no linked line: the whole rent. A
 * household contribution is already what the person pays, so it is never shared again.
 */
export function rentAtShare(saved: number, budget: readonly BudgetEntryItem[]): number {
  const line = budget.find(
    (row) =>
      row.linkKind === "housing" &&
      row.isIncome !== true &&
      row.category === BUDGET_HOUSING_CATEGORY,
  );
  return line && line.ownership === "joint" ? applyBudgetEntryShare(saved, line) : saved;
}

/**
 * Housing cost and its share of take-home pay (E32): the one housing figure (audit slice 5), the
 * same `housingPayment` the budget's linked housing line, commitments and Retirement read. Reads
 * saved facts only; of the budget it reads only the linked housing line's share of a shared rent,
 * never a row's amount, so a rent recorded as a budget row is not counted twice. Unknown, never 0,
 * when either side is missing.
 */
export function selectHousingCost(
  profile: ProfileFacts,
  takeHome: Figure<TakeHome>,
  snapshot: PortfolioSnapshot,
  rawAccounts: readonly RawAccount[],
  budget: readonly BudgetEntryItem[] = [],
): Figure<HousingCost> {
  const { kind, monthly, paymentEstimated, missing } = housingPayment(
    profile,
    snapshot,
    rawAccounts,
    budget,
  );

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

/** One month of housing from saved facts, with no take-home share. */
export interface HousingPayment {
  kind: HousingCost["kind"];
  /** Pounds a month. */
  monthly: number;
  paymentEstimated: boolean;
}

/*
 * Whose cost it is: the person's own, worked out once here. A rent is saved whole and taken at the
 * linked housing line's share when that line is joint (JO-8); a household contribution is already
 * the person's own payment. A
 * mortgage's saved payment or estimate comes from the snapshot, which already counts a joint
 * mortgage at the person's share, so the line's own share is never applied to it. The budget's
 * linked housing line counts this figure at 100%, with no second share.
 */

/**
 * The monthly housing payment alone, from saved facts (housing status, the saved amount, or the
 * mortgage accounts' estimate). Null when it is not known. The budget's housing line reads this,
 * so the rent or mortgage payment is stored once (owner item 33b).
 */
export function selectHousingPayment(
  profile: ProfileFacts,
  snapshot: PortfolioSnapshot,
  rawAccounts: readonly RawAccount[],
  budget: readonly BudgetEntryItem[] = [],
): HousingPayment | null {
  const { kind, monthly, paymentEstimated, missing } = housingPayment(
    profile,
    snapshot,
    rawAccounts,
    budget,
  );
  if (missing.length > 0 || monthly === null) return null;
  return { kind, monthly, paymentEstimated };
}

function housingPayment(
  profile: ProfileFacts,
  snapshot: PortfolioSnapshot,
  rawAccounts: readonly RawAccount[],
  budget: readonly BudgetEntryItem[],
): {
  kind: HousingCost["kind"];
  monthly: number | null;
  paymentEstimated: boolean;
  missing: MissingKey[];
} {
  const missing: MissingKey[] = [];
  const saved = positive(profile.monthlyHousingCost);
  let kind: HousingCost["kind"] = "rent";
  let monthly: number | null = null;
  let paymentEstimated = false;

  if (profile.housingStatus === "renting") {
    monthly = saved === null ? null : rentAtShare(saved, budget);
    if (monthly === null) missing.push("monthlyHousingCost");
  } else if (profile.housingStatus === "mortgage") {
    kind = "mortgage";
    // An interest-only payment cannot be estimated from a repayment formula, but a saved one counts.
    const accounts = homeMortgagePayments(snapshot, rawAccounts);
    if (accounts !== null) {
      monthly = accounts.monthly;
      paymentEstimated = accounts.estimated;
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
  return { kind, monthly, paymentEstimated, missing };
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
