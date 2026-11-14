import {
  anonymiseDescription,
  anonymousBudgetEntryLabels,
  genericAccountLabel,
} from "./anonymise.js";
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
import { buildFinancialPicture } from "./picture/build.js";
import { isFigureKnown } from "./picture/figure.js";
import { type ProfileFacts, profileFactsFromProfile } from "./picture/input.js";
import {
  type MonthlyPortfolioHistoryPoint,
  PortfolioSnapshot,
  type RawAccount,
  type RawAccountDetail,
  type ResolvedAccount,
} from "./portfolio.js";
import { calculateUKTax, type TaxCalculationResult, type TaxRecord } from "./tax-calculator.js";
import type {
  AvalancheVsSnowballComparison,
  FinancialBaseline,
  NormalizedDebtItem,
  PromoCliffAlert,
  SafeToSpendResult,
  StudentLoanEvaluationResult,
  UkTaxCalculationResult,
} from "./types.js";
import { calculateUkTax as computeUkTax, getCurrentUKTaxYear } from "./uk-tax.js";

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
}

export interface BuildContextPackInput {
  baseline: FinancialBaseline;
  accounts?: RawAccount[];
  accountDetails?: RawAccountDetail[];
  budgetEntries?: BudgetEntryItem[];
  taxRecords?: TaxRecord[];
  /**
   * The saved profile facts (no defaults). The budget summary's safe to spend needs them for
   * take-home; without them it is null rather than a guess from the defaulted baseline.
   */
  profileFacts?: ProfileFacts;
  /** What net worth counts: the user's choices (netWorthBasisFromProfile). */
  netWorthBasis: NetWorthBasis;
}

/** The saved baseline as the pack carries it: figures only, so no computed stage. */
export type ContextPackBaseline = Omit<FinancialBaseline, "financialStage">;

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
    entries: BudgetEntryItem[];
  };
  taxSummary: {
    currentTaxYear: string;
    ukTaxCalculation: UkTaxCalculationResult;
    selfAssessmentLedgerSummary?: TaxCalculationResult;
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
  const { financialStage: _stage, ...baselineFigures } = input.baseline;
  const safeBaseline: ContextPackBaseline = {
    ...baselineFigures,
    userId: isAnonymized ? "anonymous-user" : input.baseline.userId,
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
      return {
        ...acc,
        name: genericName,
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
  const comparison = compareAvalancheAndSnowball(debtItems, 50);
  const totalDebtBalance = consumerDebts.reduce((sum, d) => sum + d.balanceGbp, 0);

  // Analyze promo cliffs if any
  const fullSchedule = calculateDebtSchedule(consumerDebts, 50, "AVALANCHE");
  const promoCliffAlerts = fullSchedule.promoCliffAlerts;

  // Student loan evaluation if user has one
  let studentLoanEvaluation: StudentLoanEvaluationResult | undefined;
  if (safeBaseline.studentLoanPlan && safeBaseline.studentLoanPlan !== "NONE") {
    studentLoanEvaluation = evaluateUkStudentLoan(
      safeBaseline.studentLoanPlan,
      safeBaseline.annualGrossSalary,
      15000, // standard baseline balance proxy
    );
  }

  // 5. Budget & Runway Evaluation
  // M-PRIV4: anonymised, no free-text entry name leaves: income becomes "Income #n" and every
  // other entry its (scrubbed) category plus an ordinal, as the MCP budget tool does.
  const rawBudgetEntries = input.budgetEntries ?? [];
  const anonymousLabels = isAnonymized ? anonymousBudgetEntryLabels(rawBudgetEntries) : undefined;
  const budgetEntries = rawBudgetEntries.map((entry, idx) => {
    const name = anonymousLabels ? (anonymousLabels[idx] ?? "Budget entry") : entry.name;
    // Free-text notes can hold anything, so they are dropped when anonymised.
    const { notes, ...rest } = entry;
    return {
      ...rest,
      ...(isAnonymized || notes === undefined ? {} : { notes }),
      ...(isAnonymized && typeof entry.category === "string"
        ? { category: anonymiseDescription(entry.category) }
        : {}),
      id: entry.id || `b_${idx}`,
      name,
    };
  });

  // The budget summary comes from the one financial picture, so MCP and web agree (E23).
  const picture = buildFinancialPicture(
    {
      profile: input.profileFacts ?? profileFactsFromProfile(null),
      netWorthBasis: input.netWorthBasis,
      accounts: sanitizedRawAccounts,
      details: rawDetails,
      budget: budgetEntries,
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
  const ukTaxCalculation = computeUkTax({
    grossSalary: safeBaseline.annualGrossSalary,
    pensionContributionPct: safeBaseline.pensionContributionPct,
    isSalarySacrifice: safeBaseline.isSalarySacrifice,
    studentLoanPlan: safeBaseline.studentLoanPlan,
    region: safeBaseline.ukRegion,
    taxYear: safeBaseline.taxYear,
  });

  let selfAssessmentLedgerSummary: TaxCalculationResult | undefined;
  if (input.taxRecords && input.taxRecords.length > 0) {
    selfAssessmentLedgerSummary = calculateUKTax(
      safeBaseline.taxYear || getCurrentUKTaxYear(),
      input.taxRecords,
      safeBaseline.annualGrossSalary,
      safeBaseline.propertyOwnershipSharePct ?? 100,
    );
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
      entries: budgetEntries,
    },
    taxSummary: {
      currentTaxYear: safeBaseline.taxYear || getCurrentUKTaxYear(),
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
  if (joined !== "")
    lines.push(`\n- **Not counted in net worth (the user's settings):** ${joined}`);
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

  return `# Flump context pack
Generated: ${pack.metadata.generatedAt} | Anonymised: ${pack.metadata.isAnonymized ? "yes" : "no"} | Currency: ${pack.metadata.currency}

## 1. Summary
- **Observations:**
${pack.observations.map((o) => `  * ${o}`).join("\n") || "  * None."}

## 2. Net worth
- **Net worth:** ${formatSignedGbp(p.netWorth)}${formatLeavesOut(p.netWorthLeavesOut)}
- **What you own:** £${p.totalAssets.toLocaleString("en-GB")} (cash you can get at quickly: £${p.totalLiquidCash.toLocaleString("en-GB")}, investments: £${p.totalInvestments.toLocaleString("en-GB")}, pensions: £${p.totalPensions.toLocaleString("en-GB")}${p.homeEstimate > 0 ? `, Home (your estimate): £${p.homeEstimate.toLocaleString("en-GB")}` : ""})
- **What you owe:** £${p.totalLiabilities.toLocaleString("en-GB")} (debts: £${p.totalConsumerDebt.toLocaleString("en-GB")}, mortgages: £${p.totalMortgageBalance.toLocaleString("en-GB")})
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
- **Months of cover:** ${bg.emergencyRunwayMonths === null ? "Not set" : `${bg.emergencyRunwayMonths.toFixed(1)} months`}
- **Safe to spend:** ${bg.safeToSpend ? `${formatSignedGbp(bg.safeToSpend.weeklyAllowance)} a week` : "Not set"}
- **Income minus spending, a month:** ${gbpOrNotSet(bg.monthlySurplus)}

## 5. Tax, ${pack.taxSummary.currentTaxYear}
- **Salary before tax:** £${b.annualGrossSalary.toLocaleString("en-GB")}
- **Tax region:** ${b.ukRegion}
- **Adjusted net income:** £${tx.adjustedNetIncomeGbp.toLocaleString("en-GB")}
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
