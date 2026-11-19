import { categorizeAccountType } from "./account-category.js";
import type { BudgetEntryItem, BuildContextPackInput } from "./ai-context-pack.js";
import { applyAccountShare } from "./joint-share.js";
import { figureUnknown } from "./picture/figure.js";
import { SAVINGS_CATEGORY } from "./picture/selectors/budget-totals.js";
import { withLinkedBudgetRows } from "./picture/selectors/linked-budget-rows.js";
import { isBuyToLetAccount } from "./picture/selectors/loan-to-value.js";
import { PortfolioSnapshot, type RawAccount } from "./portfolio.js";
import {
  type BudgetLineRetirementStatus,
  DEFAULT_RETIREMENT_GROWTH_CASES,
  DEFAULT_RETIREMENT_INFLATION_RATE,
  doesAccountCountTowardsRetirement,
  isHousingBudgetLine,
  type RetirementBudgetTargetLine,
  type RetirementGrowthBand,
  type RetirementHousingInput,
  type RetirementHousingOverride,
  type RetirementPlanInput,
  type RetirementPotAccountInput,
  type RetirementStatePensionInput,
  type RetirementTargetInput,
} from "./retirement.js";
import type { WorkplacePensionInput } from "./workplace-pension.js";

/**
 * The one place a saved retirement plan and the user's saved figures become a
 * `RetirementPlanInput` (E33). The web page and both MCP tools call it, so they give the same
 * figures. It never fills in an age, a target or a State Pension amount the user has not given.
 */

/** The saved plan as the backend returns it (the `RetirementPlanDto` shape, plain data). */
export interface RetirementSavedPlanInput {
  retirementAge?: number | null;
  planToAge?: number | null;
  target?:
    | { kind: "typed"; yearlyAmount: number }
    | {
        kind: "budget";
        lineSettings: readonly { budgetEntryId: string; status?: BudgetLineRetirementStatus }[];
      }
    | null;
  housingOverride?: RetirementHousingOverride | null;
  statePensionAge?: number | null;
  statePensionAnnualForecastGbp?: number | null;
  statePensionQualifyingYears?: number | null;
  growthRates?: RetirementGrowthBand<number> | null;
  inflationRate?: number | null;
  cashSavingsNominalRate?: number | null;
  realRentGrowthRate?: number | null;
  excludedAccountIds?: readonly string[] | null;
}

/** What-if values that sit on top of the saved plan. They are never saved. */
export interface RetirementInputOverrides {
  retirementAge?: number;
  planToAge?: number;
  targetYearlyGbp?: number;
  statePensionAge?: number;
  statePensionAnnualForecastGbp?: number;
  statePensionQualifyingYears?: number;
  growthRates?: Partial<RetirementGrowthBand<number>>;
  inflationRate?: number;
  additionalMonthlyPensionContributionGbp?: number;
  /** Your workplace contribution as a percentage of pay. Applies only when a salary is saved. */
  employeePercent?: number;
  /** Count only pay inside the qualifying earnings band. Applies only when a salary is saved. */
  useQualifyingEarnings?: boolean;
}

export interface BuildRetirementPlanInputArgs {
  plan: RetirementSavedPlanInput | null;
  /** The saved birth year from the profile, or null when not saved. */
  birthYear: number | null | undefined;
  /** "Now", for working out the current age from the birth year. */
  now: Date;
  /** The saved housing status ("renting", "mortgage", "own_outright", "living_with_family"). */
  housingStatus?: string | null;
  /** The saved monthly rent or housing payment. */
  monthlyHousingCostGbp?: number | null;
  /** The user's accounts as stored (signed balances, ownership and share fields). */
  accounts: readonly RawAccount[];
  /** Saved budget entries, needed when the saved target is built from budget lines. */
  budgetEntries?: readonly BudgetEntryItem[];
  /** The saved workplace pension (`workplacePensionFromProfile`), or null without a salary. */
  workplacePension?: WorkplacePensionInput | null;
  overrides?: RetirementInputOverrides;
}

export type RetirementInputMissingField = "birthYear" | "retirementAge" | "planToAge";
export type RetirementStatePensionMissingField = "statePensionAge" | "statePensionAmount";

/** An account that could count towards retirement, for the "counts towards retirement" list. */
export interface RetirementCountableAccount {
  id: string;
  name: string;
  type: string;
  /** The user's share of the balance (joint accounts at their share). */
  balanceGbp: number;
  counts: boolean;
}

interface BuildCommon {
  /** Accounts mapped for the engine (shared balances, exclusions applied). */
  accounts: (RetirementPotAccountInput & { id: string })[];
  /** Accounts the user can choose to count: never property or debts. */
  countableAccounts: RetirementCountableAccount[];
  currentAge: number | null;
}

export type RetirementInputBuildResult =
  | (BuildCommon & {
      ok: true;
      input: RetirementPlanInput;
      currentAge: number;
      /** True when the saved retirement age was below the current age and was raised to it. */
      retirementAgeAdjusted: boolean;
      /** What stops the State Pension going into the estimate; empty when it is included. */
      statePensionMissing: RetirementStatePensionMissingField[];
    })
  | (BuildCommon & { ok: false; missing: RetirementInputMissingField[] });

const HOUSING_STATUSES = ["renting", "mortgage", "own_outright", "living_with_family"] as const;
type HousingStatus = (typeof HOUSING_STATUSES)[number];

function normaliseHousingStatus(raw: string | null | undefined): HousingStatus | null {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (HOUSING_STATUSES as readonly string[]).includes(value) ? (value as HousingStatus) : null;
}

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function wholeAge(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function shareInput(a: RawAccount) {
  return {
    type: a.type ?? null,
    name: a.name ?? null,
    accountSubtype: a.accountSubtype ?? null,
    ownership: a.ownership ?? null,
    sharePercent: a.sharePercent ?? null,
  };
}

function mapAccounts(
  accounts: readonly RawAccount[],
  excluded: ReadonlySet<string>,
): (RetirementPotAccountInput & { id: string })[] {
  const out: (RetirementPotAccountInput & { id: string })[] = [];
  for (const a of accounts) {
    if (!a.id) continue;
    const id = String(a.id);
    const share = shareInput(a);
    const balance = finiteOrNull(a.balance) ?? 0;
    const contribution = finiteOrNull(a.monthlyContribution);
    const mapped: RetirementPotAccountInput & { id: string } = {
      id,
      name: a.name ?? "",
      type: a.type ?? null,
      balanceGbp: applyAccountShare(balance, share),
      monthlyContributionGbp: contribution === null ? null : applyAccountShare(contribution, share),
      interestRatePct: finiteOrNull(a.interestRate),
      ownership: a.ownership ?? undefined,
      sharePercent: a.sharePercent ?? undefined,
    };
    if (excluded.has(id)) mapped.countsTowardsRetirement = false;
    out.push(mapped);
  }
  return out;
}

function countableAccounts(
  mapped: readonly (RetirementPotAccountInput & { id: string })[],
): RetirementCountableAccount[] {
  return mapped
    .filter(
      (a) =>
        doesAccountCountTowardsRetirement({ type: a.type, countsTowardsRetirement: true }) &&
        categorizeAccountType(a.type) !== "cash",
    )
    .map((a) => ({
      id: a.id,
      name: a.name ?? "",
      type: String(a.type ?? ""),
      balanceGbp: a.balanceGbp,
      counts: doesAccountCountTowardsRetirement(a),
    }));
}

function mortgageDetails(accounts: readonly RawAccount[]): RetirementHousingInput["mortgage"] {
  // The home mortgage only: a buy-to-let mortgage is not a housing cost (HM-8).
  const mortgage = accounts.find(
    (a) => categorizeAccountType(a.type) === "mortgages" && !isBuyToLetAccount(a),
  );
  if (!mortgage) return null;
  const share = shareInput(mortgage);
  const balance = Math.abs(finiteOrNull(mortgage.balance) ?? 0);
  const payment = finiteOrNull(mortgage.monthlyContribution);
  const rate = finiteOrNull(mortgage.interestRate);
  const term = finiteOrNull(mortgage.termMonths);
  // No invented interest rate: without a saved rate or payment the term cannot be costed.
  if (rate === null && (payment === null || payment <= 0)) return null;
  return {
    balanceGbp: applyAccountShare(balance, share),
    interestRateApr: rate,
    remainingTermMonths: term,
    monthlyPaymentGbp: payment === null ? null : applyAccountShare(payment, share),
  };
}

function budgetTarget(
  lineSettings: readonly { budgetEntryId: string; status?: BudgetLineRetirementStatus }[],
  entries: readonly BudgetEntryItem[],
  accounts: readonly RawAccount[],
): RetirementTargetInput | null {
  const statuses = new Map(lineSettings.map((s) => [s.budgetEntryId, s.status]));
  // A debt line linked to a card or loan (audit slice 5) reads the account's monthly payment at the
  // person's share, as the budget does; keyed by its stored id so its continues/stops setting
  // stays. One that is Not set (no saved payment, account gone) has no figure, so it is left out.
  const debtLines: RetirementBudgetTargetLine[] = withLinkedBudgetRows(entries, {
    takeHome: figureUnknown(["annualSalary"], "not-set"),
    housing: null,
    accounts: new PortfolioSnapshot([...accounts]),
  })
    .rows.filter((r) => r.linked === "debt" && !r.notSet && r.linkedRowId)
    .map((r) => {
      const id = r.linkedRowId as string;
      return {
        id,
        name: r.name,
        category: r.category,
        amount: r.amount,
        frequency: r.frequency,
        isIncome: false,
        status: statuses.get(id) ?? "continues",
      };
    });
  const lines: RetirementBudgetTargetLine[] = entries
    .filter(
      (e) =>
        !e.isIncome &&
        // A linked line's stored amount is never read (take-home and housing are left out anyway).
        !e.linkKind &&
        !e.linked &&
        !isHousingBudgetLine({ category: e.category }) &&
        e.category.trim().toLowerCase() !== SAVINGS_CATEGORY,
    )
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      amount: e.amount,
      frequency: e.frequency,
      isIncome: e.isIncome,
      status: statuses.get(e.id) ?? "continues",
    }));
  lines.push(...debtLines);
  return lines.length === 0 ? null : { kind: "budget", lines };
}

/**
 * Builds the engine input from the saved plan and saved figures, with optional what-if overrides.
 * Returns the missing details instead when the birth year, retirement age or plan-to age is not
 * known. A retirement age below the current age is raised to it, and a plan-to age at or below
 * the retirement age is raised to one year after it, so the engine never throws on saved data.
 */
export function buildRetirementPlanInput(
  args: BuildRetirementPlanInputArgs,
): RetirementInputBuildResult {
  const plan = args.plan;
  const overrides = args.overrides ?? {};
  const excluded = new Set((plan?.excludedAccountIds ?? []).map(String));
  const accounts = mapAccounts(args.accounts, excluded);
  const countable = countableAccounts(accounts);

  const birthYear = wholeAge(args.birthYear ?? null);
  const currentAge =
    birthYear !== null && birthYear > 0 ? Math.max(0, args.now.getUTCFullYear() - birthYear) : null;
  const savedRetirementAge = wholeAge(overrides.retirementAge ?? plan?.retirementAge ?? null);
  const savedPlanToAge = wholeAge(overrides.planToAge ?? plan?.planToAge ?? null);

  const missing: RetirementInputMissingField[] = [];
  if (currentAge === null) missing.push("birthYear");
  if (savedRetirementAge === null) missing.push("retirementAge");
  if (savedPlanToAge === null) missing.push("planToAge");
  if (currentAge === null || savedRetirementAge === null || savedPlanToAge === null) {
    return { ok: false, missing, accounts, countableAccounts: countable, currentAge };
  }

  const retirementAge = Math.max(currentAge, savedRetirementAge);
  const planToAge = Math.max(retirementAge + 1, savedPlanToAge);

  let target: RetirementTargetInput | null = null;
  if (overrides.targetYearlyGbp !== undefined) {
    target = { kind: "typed", yearlyAmount: overrides.targetYearlyGbp };
  } else if (plan?.target?.kind === "typed") {
    target = { kind: "typed", yearlyAmount: plan.target.yearlyAmount };
  } else if (plan?.target?.kind === "budget") {
    target = budgetTarget(plan.target.lineSettings, args.budgetEntries ?? [], args.accounts);
  }

  const statePensionAge = wholeAge(overrides.statePensionAge ?? plan?.statePensionAge ?? null);
  const forecast = finiteOrNull(
    overrides.statePensionAnnualForecastGbp ?? plan?.statePensionAnnualForecastGbp ?? null,
  );
  const qualifyingYears = finiteOrNull(
    overrides.statePensionQualifyingYears ?? plan?.statePensionQualifyingYears ?? null,
  );
  const statePensionMissing: RetirementStatePensionMissingField[] = [];
  if (statePensionAge === null) statePensionMissing.push("statePensionAge");
  if (forecast === null && qualifyingYears === null) statePensionMissing.push("statePensionAmount");
  const statePension: RetirementStatePensionInput | null =
    statePensionMissing.length === 0
      ? { statePensionAge, annualForecastGbp: forecast, qualifyingYears }
      : null;

  // Decision RD4: a 2%, 5%, 8% reference band and 2% inflation until the user changes them.
  const savedRates = plan?.growthRates ?? DEFAULT_RETIREMENT_GROWTH_CASES;
  const growthRates: RetirementGrowthBand<number> = {
    lower: overrides.growthRates?.lower ?? savedRates.lower,
    middle: overrides.growthRates?.middle ?? savedRates.middle,
    higher: overrides.growthRates?.higher ?? savedRates.higher,
  };
  const inflationRate =
    overrides.inflationRate ?? plan?.inflationRate ?? DEFAULT_RETIREMENT_INFLATION_RATE;
  const cashRate = finiteOrNull(plan?.cashSavingsNominalRate ?? null);
  const realRentGrowthRate = finiteOrNull(plan?.realRentGrowthRate ?? null);

  const input: RetirementPlanInput = {
    currentAge,
    retirementAge,
    planToAge,
    accounts,
    additionalMonthlyPensionContributionGbp: overrides.additionalMonthlyPensionContributionGbp,
    workplacePension: args.workplacePension
      ? {
          ...args.workplacePension,
          ...(overrides.employeePercent !== undefined
            ? { employeePercent: overrides.employeePercent }
            : {}),
          ...(overrides.useQualifyingEarnings !== undefined
            ? { useQualifyingEarnings: overrides.useQualifyingEarnings }
            : {}),
        }
      : null,
    target,
    housing: {
      housingStatus: normaliseHousingStatus(args.housingStatus),
      monthlyHousingCostGbp: finiteOrNull(args.monthlyHousingCostGbp),
      mortgage: mortgageDetails(args.accounts),
      override: plan?.housingOverride ?? null,
    },
    statePension,
    assumptions: {
      growthRates,
      inflationRate,
      ...(cashRate !== null ? { cashSavingsNominalRate: cashRate } : {}),
      ...(realRentGrowthRate !== null ? { realRentGrowthRate } : {}),
    },
  };

  return {
    ok: true,
    input,
    accounts,
    countableAccounts: countable,
    currentAge,
    retirementAgeAdjusted: retirementAge !== savedRetirementAge,
    statePensionMissing,
  };
}

/**
 * The MCP read model's mapping: the builder arguments from the loaded user data. The housing
 * facts come from the saved profile facts (no defaults), falling back to the baseline status.
 */
export function retirementArgsFromContextInput(
  data: BuildContextPackInput,
  now: Date,
  overrides?: RetirementInputOverrides,
): BuildRetirementPlanInputArgs {
  return {
    plan: data.retirementPlan ?? null,
    birthYear: data.birthYear ?? null,
    now,
    housingStatus: data.profileFacts?.housingStatus ?? data.baseline?.housingStatus ?? null,
    monthlyHousingCostGbp: data.profileFacts?.monthlyHousingCost ?? null,
    accounts: data.accounts ?? [],
    budgetEntries: data.budgetEntries ?? [],
    workplacePension: data.workplacePension ?? null,
    overrides,
  };
}
