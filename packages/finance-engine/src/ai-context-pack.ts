import {
  anonymousAccountType,
  createBudgetCategoryAnonymiser,
  createBudgetEntryAnonymiser,
  createTaxCategoryAnonymiser,
  createTaxRecordAnonymiser,
  genericAccountLabel,
} from "./anonymise.js";
import { formatBreathingRoomFigure } from "./breathing-room-wording.js";
import {
  calculateDebtSchedule,
  compareAvalancheAndSnowball,
  evaluateUkStudentLoan,
  filterConsumerDebts,
} from "./debt-payoff.js";
import {
  joinNetWorthLeftOut,
  type NetWorthBasis,
  type NetWorthLeftOut,
} from "./net-worth-basis.js";
import { isSelfEmployedType, payeSalaryForTax } from "./paye-salary-for-tax.js";
import { buildFinancialPicture } from "./picture/build.js";
import { isFigureKnown } from "./picture/figure.js";
import { type ProfileFacts, profileFactsFromProfile } from "./picture/input.js";
import { listedBudgetEntries } from "./picture/selectors/linked-budget-rows.js";
import {
  type MonthlyPortfolioHistoryPoint,
  PortfolioSnapshot,
  type RawAccount,
  type RawAccountDetail,
  type ResolvedAccount,
} from "./portfolio.js";
import type { SavedFinancialBaseline, UnsavedBaselineField } from "./profile.js";
import type { RetirementSavedPlanInput } from "./retirement-input.js";
import {
  calculateUKTax,
  type TaxCalculationResult,
  type TaxRecordFields,
} from "./tax-calculator.js";
import {
  estimateInputsFor,
  type TaxEstimateFacts,
  type TaxEstimateMissingFact,
} from "./tax-estimate-inputs.js";
import type {
  AvalancheVsSnowballComparison,
  FinancialBaseline,
  NormalizedDebtItem,
  PromoCliffAlert,
  SafeToSpendResult,
  StudentLoanEvaluationResult,
  UkTaxCalculationResult,
} from "./types.js";
import { calculateUkTax as computeUkTax } from "./uk-tax.js";
import { resolveUkTaxYear } from "./uk-tax-year.js";
import type { WorkplacePensionInput } from "./workplace-pension.js";

export interface AnonymizationOptions {
  /** If true, bank and provider names ("Monzo", "Barclays", etc.) are mapped to generic labels */
  anonymizeInstitutions?: boolean;
}

export interface BudgetEntryItem {
  id: string;
  category: string;
  name: string;
  amount: number;
  frequency: "monthly" | "annual" | "weekly" | string;
  isIncome: boolean;
  isEssential: boolean;
  notes?: string | null;
  /** E34 C1: "joint" counts the entry at `sharePercent` (50 when unset); absent means sole. */
  ownership?: "sole" | "joint" | string | null;
  sharePercent?: number | null;
  /** True when the person marked this row as their own main pay. Read by the take-home link. */
  isPrimaryIncome?: boolean;
  /**
   * Set only on a line the engine makes from a saved fact (owner items 7 and 33b): "take_home"
   * from the profile's salary, "housing" from the housing details. Never stored.
   */
  linked?: "take_home" | "housing";
  /**
   * Stored on a row the person linked to a saved fact ("Use your take-home pay"). Its stored
   * amount is never read: the linked figure stands in for it, keeping its ownership and share.
   */
  linkKind?: "take_home" | "housing" | null;
  /** On an engine line standing in for a row the person linked: that row's stored id. */
  linkedRowId?: string;
  /**
   * True on a linked line whose saved fact is not set (salary cleared, no rent saved). Its amount
   * is not a figure: it shows "Not set" with an action, and totals that would count it are unknown.
   */
  notSet?: true;
}

/** A linked budget entry whose saved fact is not set: no amount, left out of every total. */
export type ContextPackBudgetLineNotSet = Omit<BudgetEntryItem, "amount" | "notSet"> & {
  notSet: true;
};

/**
 * The budget as the picture counts it (`listedBudgetEntries`: lines the engine added included,
 * shadowed rows left out, linked figures resolved), and apart from them the linked rows
 * whose saved fact is not set (they have no amount): a linked row's stored £0 is never listed.
 */
function contextPackLines(
  entries: readonly BudgetEntryItem[],
  resolved: readonly BudgetEntryItem[],
): { entries: BudgetEntryItem[]; entriesNotSet: ContextPackBudgetLineNotSet[] } {
  const listed: BudgetEntryItem[] = [];
  const notSet: ContextPackBudgetLineNotSet[] = [];
  for (const entry of listedBudgetEntries(entries, resolved)) {
    const { linkedRowId: _id, notSet: isNotSet, ...line } = entry;
    if (isNotSet) {
      const { amount: _amount, ...rest } = line;
      notSet.push({ ...rest, notSet: true });
    } else {
      listed.push(line);
    }
  }
  return { entries: listed, entriesNotSet: notSet };
}

export interface BuildContextPackInput {
  /** Its `notSet` (userProfileToSavedBaseline) names stand-in zeros the pack leaves out (AI-1). */
  baseline: SavedFinancialBaseline;
  accounts?: RawAccount[];
  accountDetails?: RawAccountDetail[];
  budgetEntries?: BudgetEntryItem[];
  taxRecords?: TaxRecordFields[];
  /**
   * The saved profile facts (no defaults). The budget summary's safe to spend needs them for
   * take-home; without them it is null rather than a guess from the defaulted baseline.
   */
  profileFacts?: ProfileFacts;
  /** What net worth counts: the user's choices (netWorthBasisFromProfile). */
  netWorthBasis: NetWorthBasis;
  /**
   * The saved retirement plan (E33), or null when none is saved. Read by the MCP retirement
   * tools only; never part of the context pack text.
   */
  retirementPlan?: RetirementSavedPlanInput | null;
  /**
   * The saved workplace pension (`workplacePensionFromProfile`), or null without a salary. Read by
   * the MCP retirement tools only.
   */
  workplacePension?: WorkplacePensionInput | null;
  /** The saved birth year from the profile, or null. The baseline `age` has a default, so it is not used. */
  birthYear?: number | null;
}

/** The user id an anonymised pack or input carries in place of the real one. */
// A fixed label, not a credential.
// nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_username
export const ANONYMOUS_USER_ID = "anonymous-user";

/**
 * Budget entries with every user-typed text replaced (ruling 7): the name becomes a neutral label
 * by group ("Bills 1"), a category the user typed becomes "Custom category 1" (built-in categories
 * stay, so totals are unchanged) and notes are dropped. Amounts, frequencies and flags stay.
 */
export function anonymiseBudgetEntries(entries: readonly BudgetEntryItem[]): BudgetEntryItem[] {
  const entryLabel = createBudgetEntryAnonymiser();
  const categoryLabel = createBudgetCategoryAnonymiser();
  return entries.map((entry) => {
    const { notes: _notes, ...rest } = entry;
    return {
      ...rest,
      name: entryLabel(entry),
      category: categoryLabel(typeof entry.category === "string" ? entry.category : ""),
    };
  });
}

/**
 * Tax records with every user-typed text replaced (ruling 7): the name becomes a neutral label by
 * source ("Rental 1"), a category outside the app's fixed list becomes "Custom category 1" and notes
 * are dropped. Amounts, dates, sources and fixed category ids stay, so the tax maths is unchanged.
 */
export function anonymiseTaxRecords<T extends TaxRecordFields>(records: readonly T[]): T[] {
  const nameLabel = createTaxRecordAnonymiser();
  const categoryLabel = createTaxCategoryAnonymiser();
  return records.map((record) => ({
    ...record,
    category: categoryLabel(typeof record.category === "string" ? record.category : ""),
    name: nameLabel(record),
    notes: null,
  }));
}

/**
 * The raw input with every free-text or identifying field replaced, by the same rules the
 * anonymised context pack uses: accounts get generic per-type labels, budget entries and tax
 * records the neutral labels above with no notes, and the baseline no user id. Figures, ids, dates and types are unchanged, so every calculation on the
 * result matches the same calculation on the input. Applying it twice changes nothing more.
 */
export function anonymiseContextPackInput(input: BuildContextPackInput): BuildContextPackInput {
  const counters: Record<string, number> = {};
  const accounts = input.accounts?.map((acc) => {
    const typeKey = genericAccountLabel(acc.type, 0).replace(/ Account #0$/, "");
    counters[typeKey] = (counters[typeKey] ?? 0) + 1;
    return {
      ...acc,
      name: genericAccountLabel(acc.type, counters[typeKey]),
      type: anonymousAccountType(acc.type),
    };
  });
  const budgetEntries = input.budgetEntries
    ? anonymiseBudgetEntries(input.budgetEntries)
    : undefined;
  const taxRecords = input.taxRecords ? anonymiseTaxRecords(input.taxRecords) : undefined;
  return {
    ...input,
    baseline: { ...input.baseline, userId: ANONYMOUS_USER_ID },
    ...(accounts ? { accounts } : {}),
    ...(budgetEntries ? { budgetEntries } : {}),
    ...(taxRecords ? { taxRecords } : {}),
  };
}

/**
 * The saved baseline as the pack carries it: figures only, so no computed stage. Salary and
 * pension rates are absent when never saved, never a stand-in 0 (AI-1).
 */
export type ContextPackBaseline = Omit<FinancialBaseline, "financialStage" | UnsavedBaselineField> &
  Partial<Pick<FinancialBaseline, UnsavedBaselineField>>;

/** The salary tax calculation when no salary is saved: nothing worked out, only what is missing. */
export interface UkTaxCalculationNotSet {
  notSet: ["annualSalary"];
}

/**
 * The salary tax calculation for a self-employed person: none. The salary field is pay from an
 * employer only (owner decision 15, option A); their income is in the Self Assessment records.
 */
export interface UkTaxCalculationNotApplicable {
  notApplicable: "selfEmployed";
}

/** The salary tax calculation, with any assumption it makes in plain words. */
export type UkTaxCalculationWithAssumptions = UkTaxCalculationResult & { assumptions?: string[] };

export type PackUkTaxCalculation =
  | UkTaxCalculationWithAssumptions
  | UkTaxCalculationNotSet
  | UkTaxCalculationNotApplicable;

/** Stated when a salary is saved but no pension rate: the calculation assumes no contribution. */
export const PENSION_NOT_SET_ASSUMPTION =
  "Pension contribution not set; this estimate assumes none.";

/** True when the pack's salary tax calculation holds worked-out figures. */
export function isUkTaxCalculated(tx: PackUkTaxCalculation): tx is UkTaxCalculationWithAssumptions {
  return !("notSet" in tx) && !("notApplicable" in tx);
}

/** The Self Assessment estimate when a fact it depends on is not set (estimateInputsFor). */
export interface SelfAssessmentNotSet {
  notSet: TaxEstimateMissingFact[];
}

/** True when the pack's Self Assessment ledger holds worked-out figures. */
export function isSelfAssessmentEstimated(
  ledger: TaxCalculationResult | SelfAssessmentNotSet,
): ledger is TaxCalculationResult {
  return !("notSet" in ledger);
}

export interface FlumpAiContextPack {
  metadata: {
    generatedAt: string;
    schemaVersion: "1.0.0";
    isAnonymized: boolean;
    currency: string;
  };
  baseline: ContextPackBaseline;
  /**
   * Neutral sentences that each state one of the person's figures, in a fixed order. The pack
   * carries figures only: no score, grade, stage or priority (copy audit ruling 2, 2026-11-14).
   */
  observations: string[];
  portfolio: {
    netWorth: number;
    totalAssets: number;
    /** The user's own home estimate counted in net worth, "Home (your estimate)"; 0 if none. */
    homeEstimate: number;
    totalLiabilities: number;
    totalLiquidCash: number;
    totalInvestments: number;
    totalPensions: number;
    totalConsumerDebt: number;
    totalMortgageBalance: number;
    weightedSavingsRate: number;
    monthlyHistory: MonthlyPortfolioHistoryPoint[];
    accounts: ResolvedAccount[];
    /** The basis net worth, totals and history were computed under. */
    netWorthBasis: NetWorthBasis;
    /** What net worth leaves out under that basis, in display order. */
    netWorthLeavesOut: NetWorthLeftOut[];
  };
  debtSummary: {
    consumerDebts: NormalizedDebtItem[];
    totalStartingDebtGbp: number;
    avalancheVsSnowballComparison: AvalancheVsSnowballComparison;
    promoCliffAlerts: PromoCliffAlert[];
    studentLoanEvaluation?: StudentLoanEvaluationResult;
  };
  /**
   * From the financial picture (E23): the same figures the web pages show. null means not
   * known (no budget rows, no essentials, or no take-home), never a guessed amount.
   */
  budgetSummary: {
    /** Budgeted income rows, monthly. */
    monthlyIncome: number | null;
    essentialBillsMonthly: number | null;
    discretionarySpendMonthly: number | null;
    plannedSavingsMonthly: number | null;
    monthlySurplus: number | null;
    safeToSpend: SafeToSpendResult | null;
    /** Months of cover: liquid cash over essential commitments. */
    emergencyRunwayMonths: number | null;
    /**
     * The saved entries. A row the person linked to a saved fact carries the resolved figure a
     * month; one whose fact is not set is in `entriesNotSet` instead, never at its stored £0.
     */
    entries: BudgetEntryItem[];
    /** Linked entries whose saved fact is not set: listed apart, with no amount. */
    entriesNotSet: ContextPackBudgetLineNotSet[];
  };
  taxSummary: {
    currentTaxYear: string;
    /**
     * `{ notSet: ["annualSalary"] }` when no salary is saved (AI-1), and
     * `{ notApplicable: "selfEmployed" }` for a self-employed person (decision 15 option A).
     */
    ukTaxCalculation: PackUkTaxCalculation;
    /**
     * Absent with no tax records. `{ notSet: [...] }` names the missing fact when the estimate
     * cannot be worked out (estimateInputsFor), never a figure from a stand-in £0.
     */
    selfAssessmentLedgerSummary?: TaxCalculationResult | SelfAssessmentNotSet;
  };
}

/**
 * Builds a deterministic, PII-scrubbed FlumpAiContextPack for MCP and offline AI export.
 */
export function buildFlumpAiContextPack(
  input: BuildContextPackInput,
  options: AnonymizationOptions = {},
): FlumpAiContextPack {
  const isAnonymized = options.anonymizeInstitutions ?? true;
  const currency = "GBP";

  // 1. Scrub baseline of any direct PII identifier. The stage is dropped: figures only.
  // Figures never saved (`notSet`) are left out, not passed on as 0 (AI-1). A salary of 0 is the
  // baseline's "no salary known", so it is left out too.
  const { financialStage: _stage, notSet = [], ...baselineFigures } = input.baseline;
  const salaryKnown =
    !notSet.includes("annualGrossSalary") && baselineFigures.annualGrossSalary > 0;
  const {
    annualGrossSalary: annualSalary,
    pensionContributionPct,
    employerPensionMatchPct,
    ...knownFigures
  } = baselineFigures;
  const safeBaseline: ContextPackBaseline = {
    ...knownFigures,
    ...(salaryKnown ? { annualGrossSalary: annualSalary } : {}),
    ...(notSet.includes("pensionContributionPct") ? {} : { pensionContributionPct }),
    ...(notSet.includes("employerPensionMatchPct") ? {} : { employerPensionMatchPct }),
    userId: isAnonymized ? ANONYMOUS_USER_ID : input.baseline.userId,
  };

  // 2. Anonymize Institution / Account names if requested
  const rawAccounts = input.accounts ?? [];
  const rawDetails = input.accountDetails ?? [];

  const categoryCounters: Record<string, number> = {};
  const accountNameMap = new Map<string, string>();

  const sanitizedRawAccounts: RawAccount[] = rawAccounts.map((acc, idx) => {
    const typeKey = genericAccountLabel(acc.type, 0).replace(/ Account #0$/, "");

    if (isAnonymized) {
      categoryCounters[typeKey] = (categoryCounters[typeKey] ?? 0) + 1;
      const genericName = genericAccountLabel(acc.type, categoryCounters[typeKey]);
      accountNameMap.set(acc.id || `acc_${idx}`, genericName);
      // The stored type is free text; only a word from the fixed list (or "Other") reaches rawType.
      return {
        ...acc,
        name: genericName,
        type: anonymousAccountType(acc.type),
      };
    }
    return { ...acc };
  });

  // 3. Resolve Portfolio Snapshot
  const snapshot = new PortfolioSnapshot(sanitizedRawAccounts, rawDetails);
  // Each account's netWorthBalance is its contribution under the user's basis (0 when left out).
  const resolvedAccounts = snapshot
    .getResolvedAccounts()
    .map((a) => ({ ...a, netWorthBalance: snapshot.netWorthBalanceOf(a, input.netWorthBasis) }));

  // 4. Resolve Debt Items and Debt Schedules
  const debtItems = snapshot.toDebtItems();
  const { consumerDebts } = filterConsumerDebts(debtItems);
  // No extra payment (AI-5): the same minimum-payments plan the Debt page shows.
  const comparison = compareAvalancheAndSnowball(debtItems, 0);
  const totalDebtBalance = consumerDebts.reduce((sum, d) => sum + d.balanceGbp, 0);

  // Analyze promo cliffs if any
  const fullSchedule = calculateDebtSchedule(consumerDebts, 0, "AVALANCHE");
  const promoCliffAlerts = fullSchedule.promoCliffAlerts;

  // The student loan check needs a saved salary and a saved balance (AI-1): no guessed balance.
  const studentLoanBalance = resolvedAccounts
    .filter((a) => a.category === "studentLoans")
    .reduce((sum, a) => sum + a.nominalBalance, 0);
  let studentLoanEvaluation: StudentLoanEvaluationResult | undefined;
  if (
    salaryKnown &&
    studentLoanBalance > 0 &&
    safeBaseline.studentLoanPlan &&
    safeBaseline.studentLoanPlan !== "NONE"
  ) {
    studentLoanEvaluation = evaluateUkStudentLoan(
      safeBaseline.studentLoanPlan,
      annualSalary,
      studentLoanBalance,
    );
  }

  // 5. Budget & Runway Evaluation
  // M-PRIV4 and ruling 7: anonymised, no user-typed entry or category name and no note leaves.
  // Entries become neutral labels by group ("Bills 1", "Income 2") and typed categories
  // "Custom category 1", as the MCP budget tool does. Built-in categories stay, so totals match.
  const rawBudgetEntries = input.budgetEntries ?? [];
  const budgetEntries = (
    isAnonymized ? anonymiseBudgetEntries(rawBudgetEntries) : rawBudgetEntries
  ).map((entry, idx) => {
    const { notes, ...rest } = entry;
    return {
      ...rest,
      ...(notes === undefined ? {} : { notes }),
      id: entry.id || `b_${idx}`,
    };
  });
  const taxRecords =
    isAnonymized && input.taxRecords ? anonymiseTaxRecords(input.taxRecords) : input.taxRecords;

  // The budget summary comes from the one financial picture, so MCP and web agree (E23). It reads
  // the typed names (never sent anywhere) so the linked take-home and housing rows match the web.
  const picture = buildFinancialPicture(
    {
      profile: input.profileFacts ?? profileFactsFromProfile(null),
      netWorthBasis: input.netWorthBasis,
      accounts: sanitizedRawAccounts,
      details: rawDetails,
      budget: rawBudgetEntries.map((entry, idx) => ({ ...entry, id: entry.id || `b_${idx}` })),
    },
    { snapshot },
  );
  const pictureBudget = isFigureKnown(picture.budget) ? picture.budget.value : null;
  const pictureSafeToSpend = isFigureKnown(picture.safeToSpend) ? picture.safeToSpend.value : null;
  const pictureCover = isFigureKnown(picture.monthsOfCover) ? picture.monthsOfCover.value : null;

  const observations = buildObservations({
    consumerDebtGbp: totalDebtBalance,
    monthsOfCover: pictureCover?.months ?? null,
    leftOverMonthly: pictureBudget?.hasIncome ? pictureBudget.surplus : null,
  });

  // 7. UK Tax Calculation & Self-Assessment Ledger
  // The tax year that applies today (AI-3, SA-8), never a stored or default baseline year.
  const currentTaxYear = resolveUkTaxYear();
  // The facts the tax figures depend on: the saved profile when the caller has it, else the
  // saved baseline (a salary of 0 there is "not saved").
  const facts = input.profileFacts;
  const taxFacts: TaxEstimateFacts = facts
    ? {
        employmentType: facts.employmentType,
        annualSalary: facts.annualSalary,
        propertyOwnershipShare: facts.propertyOwnershipShare,
      }
    : {
        employmentType: safeBaseline.employmentStatus,
        annualSalary: salaryKnown ? annualSalary : null,
        propertyOwnershipShare: safeBaseline.propertyOwnershipSharePct,
      };
  // A self-employed person's salary is not PAYE pay (SA-1, decision 15 option A), so no salary
  // tax is worked out for them. No salary saved: none is worked out from a stand-in £0 (AI-1).
  const payeSalary = payeSalaryForTax({
    employmentType: taxFacts.employmentType,
    annualSalary: salaryKnown ? annualSalary : null,
  });
  const pensionAssumed = notSet.includes("pensionContributionPct");
  const ukTaxCalculation: PackUkTaxCalculation = isSelfEmployedType(taxFacts.employmentType)
    ? { notApplicable: "selfEmployed" }
    : payeSalary > 0
      ? {
          ...computeUkTax({
            grossSalary: payeSalary,
            pensionContributionPct,
            isSalarySacrifice: safeBaseline.isSalarySacrifice,
            studentLoanPlan: safeBaseline.studentLoanPlan,
            region: safeBaseline.ukRegion,
            taxYear: currentTaxYear,
          }),
          // Item 4: the assumption is stated, not left silent.
          ...(pensionAssumed ? { assumptions: [PENSION_NOT_SET_ASSUMPTION] } : {}),
        }
      : { notSet: ["annualSalary"] };

  // The Self Assessment estimate follows the one rule every surface uses (estimateInputsFor).
  let selfAssessmentLedgerSummary: TaxCalculationResult | SelfAssessmentNotSet | undefined;
  if (taxRecords && taxRecords.length > 0) {
    const inputs = estimateInputsFor(taxFacts, taxRecords, currentTaxYear);
    selfAssessmentLedgerSummary =
      inputs.status === "known"
        ? calculateUKTax(currentTaxYear, inputs.records, inputs.payeSalary, inputs.ownershipShare)
        : { notSet: inputs.missing };
  }

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      schemaVersion: "1.0.0",
      isAnonymized,
      currency,
    },
    baseline: safeBaseline,
    observations,
    portfolio: {
      // From the picture, so the home estimate (D3) counts here exactly as on the web.
      netWorth: picture.netWorth.netWorth,
      totalAssets: picture.netWorth.totalAssets,
      homeEstimate: picture.netWorth.homeEstimate,
      totalLiabilities: picture.netWorth.totalLiabilities,
      totalLiquidCash: snapshot.getTotalLiquidCash(),
      totalInvestments: snapshot.getTotalInvestments(),
      totalPensions: snapshot.getTotalPensions(),
      totalConsumerDebt: snapshot.getTotalConsumerDebt(),
      totalMortgageBalance: snapshot.getTotalMortgageBalance(),
      weightedSavingsRate: snapshot.getWeightedSavingsRate(),
      monthlyHistory: snapshot.getMonthlyHistory(input.netWorthBasis),
      accounts: resolvedAccounts,
      netWorthBasis: picture.netWorth.basis,
      netWorthLeavesOut: picture.netWorth.leftOut,
    },
    debtSummary: {
      consumerDebts,
      totalStartingDebtGbp: Math.round(totalDebtBalance * 100) / 100,
      avalancheVsSnowballComparison: comparison,
      promoCliffAlerts,
      studentLoanEvaluation,
    },
    budgetSummary: {
      monthlyIncome: pictureBudget?.hasIncome ? pictureBudget.income : null,
      essentialBillsMonthly: pictureBudget?.essentials ?? null,
      discretionarySpendMonthly: pictureBudget?.discretionary ?? null,
      plannedSavingsMonthly: pictureBudget?.savings ?? null,
      monthlySurplus: pictureBudget?.hasIncome ? pictureBudget.surplus : null,
      safeToSpend: pictureSafeToSpend
        ? {
            weeklyAllowance: pictureSafeToSpend.weekly,
            dailyAllowance: pictureSafeToSpend.daily,
            monthlyDiscretionary: pictureSafeToSpend.monthly,
            fixedCommitments: pictureSafeToSpend.commitments.total,
          }
        : null,
      emergencyRunwayMonths: pictureCover?.months ?? null,
      ...contextPackLines(budgetEntries, picture.budgetRows),
    },
    taxSummary: {
      currentTaxYear,
      ukTaxCalculation,
      selfAssessmentLedgerSummary,
    },
  };
}

/** Whole pounds, en-GB. */
function gbp(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

/**
 * One neutral sentence per known figure, always in this order. Unknown figures are left out
 * rather than guessed; nothing here ranks, grades or suggests.
 */
function buildObservations(args: {
  consumerDebtGbp: number;
  monthsOfCover: number | null;
  leftOverMonthly: number | null;
}): string[] {
  const out: string[] = [];
  if (args.consumerDebtGbp > 0) {
    out.push(`Debts total ${gbp(args.consumerDebtGbp)}, not counting mortgages and student loans.`);
  }
  if (args.monthsOfCover !== null) {
    out.push(`Cash covers ${args.monthsOfCover.toFixed(1)} months of essential spending.`);
  }
  if (args.leftOverMonthly !== null) {
    out.push(
      args.leftOverMonthly >= 0
        ? `${gbp(args.leftOverMonthly)} a month is left over after the spending and saving in the budget.`
        : `Spending and saving in the budget are ${gbp(Math.abs(args.leftOverMonthly))} a month more than income.`,
    );
  }
  return out;
}

function gbpOrNotSet(value: number | null): string {
  return value === null ? "Not set" : formatSignedGbp(value);
}

/** en-GB currency with the sign before the symbol: -£120, never £-120. */
function formatSignedGbp(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-GB");
  return value < 0 ? `-£${abs}` : `£${abs}`;
}

/**
 * Formats a FlumpAiContextPack into human-readable Markdown suitable for clipboard export.
 */
function formatLeavesOut(leftOut: readonly NetWorthLeftOut[]): string {
  const lines: string[] = [];
  const joined = joinNetWorthLeftOut(leftOut);
  if (joined !== "") lines.push(`\n- **Not counted in net worth (the user's choice):** ${joined}`);
  if (leftOut.includes("homeValueMissing")) {
    lines.push("\n- **Home value:** not saved, so the mortgage counts without it");
  }
  return lines.join("");
}

export function formatAiContextPackMarkdown(pack: FlumpAiContextPack): string {
  const p = pack.portfolio;
  const b = pack.baseline;
  const d = pack.debtSummary;
  const bg = pack.budgetSummary;
  const tx = pack.taxSummary.ukTaxCalculation;
  // The breakdown shows only the parts the totals include under the user's choices.
  const { countProperty, countStudentLoan } = p.netWorthBasis;
  const studentLoans = p.accounts
    .filter((a) => a.category === "studentLoans")
    .reduce((sum, a) => sum + a.nominalBalance, 0);

  return `# Flump context pack
Generated: ${pack.metadata.generatedAt} | Anonymised: ${pack.metadata.isAnonymized ? "yes" : "no"} | Currency: ${pack.metadata.currency}

## 1. Summary
- **Observations:**
${pack.observations.map((o) => `  * ${o}`).join("\n") || "  * None."}

## 2. Net worth
- **Net worth:** ${formatSignedGbp(p.netWorth)}${formatLeavesOut(p.netWorthLeavesOut)}
- **What you own:** £${p.totalAssets.toLocaleString("en-GB")} (cash you can get at quickly: £${p.totalLiquidCash.toLocaleString("en-GB")}, investments: £${p.totalInvestments.toLocaleString("en-GB")}, pensions: £${p.totalPensions.toLocaleString("en-GB")}${countProperty && p.homeEstimate > 0 ? `, Home (your estimate): £${p.homeEstimate.toLocaleString("en-GB")}` : ""})
- **What you owe:** £${p.totalLiabilities.toLocaleString("en-GB")} (debts: £${p.totalConsumerDebt.toLocaleString("en-GB")}${countProperty ? `, mortgages: £${p.totalMortgageBalance.toLocaleString("en-GB")}` : ""}${countStudentLoan ? `, student loans: £${studentLoans.toLocaleString("en-GB")}` : ""})
- **Average savings rate:** ${p.weightedSavingsRate}% AER

### Accounts:
${p.accounts
  .map(
    (a) =>
      `- ${a.name} (${a.category.toUpperCase()}): ${formatSignedGbp(a.nominalBalance)}${
        a.nominalBalance < 0 && a.category === "cash" ? " (overdrawn)" : ""
      }${a.interestRate ? ` @ ${a.interestRate}%` : ""}`,
  )
  .join("\n")}

## 3. Debts
- **Debt balance:** £${d.totalStartingDebtGbp.toLocaleString("en-GB")}
- **Highest rate first (avalanche):** debt-free date ${d.avalancheVsSnowballComparison.avalanche.debtFreeDate}, total interest £${d.avalancheVsSnowballComparison.avalanche.totalInterest.toLocaleString("en-GB")}
- **Smallest balance first (snowball):** debt-free date ${d.avalancheVsSnowballComparison.snowball.debtFreeDate}, total interest £${d.avalancheVsSnowballComparison.snowball.totalInterest.toLocaleString("en-GB")}
- **Interest difference (highest rate first compared with minimum payments only):** £${d.avalancheVsSnowballComparison.interestSavedAvalancheVsMin.toLocaleString("en-GB")}
${
  d.promoCliffAlerts.length > 0
    ? `\n### When the 0% deal ends:\n${d.promoCliffAlerts
        .map(
          (c) =>
            `- ${c.debtName}: the 0% deal ends ${c.promoExpiryDate}, then ${c.revertApr}% APR. Monthly payment that pays it off before then: £${c.requiredMonthlyToClearBeforeCliff}`,
        )
        .join("\n")}`
    : ""
}
${
  d.studentLoanEvaluation
    ? `\n### Student loan:\n- Plan: ${d.studentLoanEvaluation.plan.toUpperCase()} | Projected outcome: ${d.studentLoanEvaluation.projectedOutcome}\n- Detail: ${d.studentLoanEvaluation.reasoning}`
    : ""
}

## 4. Budget
- **Income in your budget, a month:** ${gbpOrNotSet(bg.monthlyIncome)}
- **Essential spending, a month:** ${gbpOrNotSet(bg.essentialBillsMonthly)}
- **Breathing room:** ${formatBreathingRoomFigure(bg.emergencyRunwayMonths)}
- **Safe to spend:** ${bg.safeToSpend ? `${formatSignedGbp(bg.safeToSpend.weeklyAllowance)} a week` : "Not set"}
- **Income minus spending, a month:** ${gbpOrNotSet(bg.monthlySurplus)}

## 5. Tax, ${pack.taxSummary.currentTaxYear}
${
  b.annualGrossSalary !== undefined && isUkTaxCalculated(tx)
    ? formatSalaryTax(b.annualGrossSalary, b, tx)
    : "notApplicable" in tx
      ? `- **Salary before tax:** Not used. Self-employed income comes from the Self Assessment records.\n- **Tax region:** ${b.ukRegion}\n`
      : `- **Salary before tax:** Not set\n- **Tax region:** ${b.ukRegion}\n`
}${formatSelfAssessment(pack.taxSummary.selfAssessmentLedgerSummary)}`;
}

/** What to add for each fact a Self Assessment estimate can be missing. */
const SELF_ASSESSMENT_MISSING_LINE: Record<TaxEstimateMissingFact, string> = {
  selfEmploymentRecords: "Not set. Add self-employed income records for this tax year.",
  annualSalary: "Not set. Add a salary.",
  untaxedIncomeRecords: "None to work out. No income outside PAYE is recorded for this tax year.",
};

/** The Self Assessment estimate line, or nothing when there are no tax records. */
function formatSelfAssessment(
  ledger: TaxCalculationResult | SelfAssessmentNotSet | undefined,
): string {
  if (!ledger) return "";
  if (!isSelfAssessmentEstimated(ledger)) {
    const missing = ledger.notSet[0] ?? "untaxedIncomeRecords";
    return `- **Self Assessment estimate:** ${SELF_ASSESSMENT_MISSING_LINE[missing]}\n`;
  }
  return `- **Self Assessment estimate:** ${gbp(Math.max(0, ledger.netAdditionalTaxToPay))}\n`;
}

/** The salary-based tax lines, shown only when a salary is saved (AI-1). */
function formatSalaryTax(
  salary: number,
  b: ContextPackBaseline,
  tx: UkTaxCalculationWithAssumptions,
): string {
  return `- **Salary before tax:** £${salary.toLocaleString("en-GB")}
- **Tax region:** ${b.ukRegion}
${(tx.assumptions ?? []).map((a) => `- **Assumption:** ${a}\n`).join("")}- **Adjusted net income:** £${tx.adjustedNetIncomeGbp.toLocaleString("en-GB")}
- **Adjusted net income in the £100,000 to £125,140 band:** ${tx.taxTrap.isInTaxTrap ? "Yes (the Personal Allowance reduces in this band)" : "No"}
${
  tx.taxTrap.isInTaxTrap
    ? `- **Contribution that brings adjusted net income to £100,000:** £${tx.taxTrap.contributionRequiredToEscapeGbp.toLocaleString("en-GB")}\n- **Estimated tax difference at that contribution:** £${tx.taxTrap.estimatedTaxSavedByEscapingGbp.toLocaleString("en-GB")}`
    : ""
}
- **ISA allowance unused this tax year:** £${tx.allowances.isaAllowanceRemainingGbp.toLocaleString("en-GB")} of £20,000
- **Pension annual allowance unused this tax year:** £${tx.allowances.pensionAllowanceRemainingGbp.toLocaleString("en-GB")} of £${tx.allowances.pensionAnnualAllowanceGbp.toLocaleString("en-GB")}
- **Personal Savings Allowance:** £${tx.allowances.personalSavingsAllowanceGbp.toLocaleString("en-GB")} (${tx.allowances.marginalIncomeTaxBand} band)
`;
}
