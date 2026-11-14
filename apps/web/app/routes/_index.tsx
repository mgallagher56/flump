import {
  type TaxRecord as EngineTaxRecord,
  getCurrentUKTaxYear,
  getRecordAnnualTotalForTaxYear,
  isFigureKnown,
  isRecordActiveInTaxYear,
  type MissingKey,
  PortfolioSnapshot,
  profileFactsFromProfile,
  selectTakeHome,
} from "@flump/finance-engine";
import type { ReactElement } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from "react-router";
import { HomeDashboard } from "~/features/dashboard/components/HomeDashboard";
import {
  buildSnapshotHistory,
  latestRecordedMonth,
  londonMonth,
} from "~/features/snapshot/snapshotModel";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { buildDebtSummary } from "~/utils/debtSummary";
import { isDemoMode } from "~/utils/demoData";
import { buildWorkspacePicture, knownOrNull } from "~/utils/financialPicture";
import { getMarketingUrl } from "~/utils/marketingUrl";

export const meta: MetaFunction = () => [{ title: "Dashboard | Flump" }];

type TakeHomeProfile = Parameters<typeof profileFactsFromProfile>[0];

const MISSING_LABELS: Partial<Record<MissingKey, string>> = {
  employmentType: "employment type",
  pensionPercent: "pension percentage",
  isSalarySacrifice: "salary sacrifice status",
};

/**
 * What the user must add for take-home to be computed, all at once. Undefined when the salary
 * itself is unset (the widget then just says "Not set").
 */
export function describeMissingTakeHome(profile: TakeHomeProfile | undefined): string | undefined {
  const figure = selectTakeHome(profileFactsFromProfile(profile));
  if (isFigureKnown(figure) || figure.missing.includes("annualSalary")) return undefined;
  const labels = figure.missing.flatMap((key) => MISSING_LABELS[key] ?? []);
  if (labels.length === 0) return undefined;
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `Add ${list}`;
}

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, userProfile, budgetEntries, accountDetails, taxRecords, user } =
    await loadWorkspaceSnapshot(args, {
      ensureSignedIn: false,
      includeBudget: true,
      includeTax: true,
    });

  if (!user) {
    // Demo is a single experience at /sandbox; signed-in users never see demo data.
    if (isDemoMode(args.request.url)) {
      return redirect("/sandbox");
    }
    // The signed-out home lives on the marketing site; the app has no public landing page.
    return redirect(getMarketingUrl(args.request.url));
  }

  if (userProfile && userProfile.onboardingCompleted === false) {
    return redirect("/app/onboarding");
  }

  const completedSteps = (userProfile?.setupChecklistCompletedSteps as string[]) ?? [];

  // Every derived figure (net worth, debt, budget totals, safe to spend, months of cover) comes
  // from the one financial picture, built once from saved rows (E23 section 2).
  const portfolioSnapshot = new PortfolioSnapshot(accounts, accountDetails);
  const picture = buildWorkspacePicture(
    { userProfile, accounts, accountDetails, budgetEntries, taxRecords },
    { snapshot: portfolioSnapshot },
  );
  const { totalAssets, totalLiabilities, netWorth, liquidCash, homeEstimate } = picture.netWorth;
  const budget = knownOrNull(picture.budget);
  const monthlyIncome = budget?.income ?? 0;
  const monthlyOutgoings = budget?.outgoings ?? 0;
  const budgetedSavings = budget?.savings ?? 0;
  const safeToSpend = knownOrNull(picture.safeToSpend);
  const monthsOfCover = knownOrNull(picture.monthsOfCover);

  // Savings accounts data
  const savingsAccounts = Array.isArray(accounts)
    ? accounts.filter((a: any) => a.type === "Saving" || a.type === "Investment")
    : [];
  const totalSavingsBalance = savingsAccounts.reduce(
    (sum: number, a: any) => sum + (Number(a.balance) || 0),
    0,
  );
  const totalMonthlyContributions = savingsAccounts.reduce(
    (sum: number, a: any) => sum + (Number(a.monthlyContribution) || 0),
    0,
  );
  // No savings balance means no weighted rate: never substitute a default rate for a real one.
  const weightedInterestRate =
    totalSavingsBalance > 0 ? portfolioSnapshot.getWeightedSavingsRate(0) : null;

  // Pension accounts data
  const pensionAccounts = Array.isArray(accounts)
    ? accounts.filter((a: any) => a.type === "Pension")
    : [];
  const totalPensionBalance = portfolioSnapshot.getTotalPensions();

  // Mortgage data
  const mortgageAccounts = Array.isArray(accounts)
    ? accounts.filter((a: any) => a.type === "Mortgage")
    : [];
  const mortgageBalance = portfolioSnapshot.getTotalMortgageBalance();
  const storedMortgageRate = mortgageAccounts[0]?.interestRate;
  const toKnownNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  // The rate lives on the mortgage account. The term is not stored anywhere, so it is unknown.
  const mortgageRate = toKnownNumber(storedMortgageRate);
  const mortgageTermYears: number | null = null;

  // Tax data
  // The engine decides what each record contributes to the current tax year (an annual record
  // counts once, in the year containing its date, decision D-7-A); other years must not leak in.
  const currentTaxYear = getCurrentUKTaxYear();
  const currentYearRecords = (Array.isArray(taxRecords) ? taxRecords : []).filter((r: any) =>
    isRecordActiveInTaxYear(r as EngineTaxRecord, currentTaxYear),
  );
  const taxRecordTotal = (type: string) =>
    currentYearRecords
      .filter((r: any) => r.type === type)
      .reduce(
        (sum: number, r: any) =>
          sum + getRecordAnnualTotalForTaxYear(r as EngineTaxRecord, currentTaxYear),
        0,
      );
  const totalTaxIncome = taxRecordTotal("income");
  const totalTaxExpenses = taxRecordTotal("expense");
  const netProfit = Math.max(0, totalTaxIncome - totalTaxExpenses);
  // C-11: the engine's self assessment estimate (tax on income outside PAYE) for the current tax
  // year, from the picture. Unknown (no income outside PAYE) stays null, never £0.
  const estimatedTaxDue: number | null = knownOrNull(picture.estimatedTaxDue)?.amount ?? null;
  // Its assumption notes (the England, Wales and NI bands for a Scottish taxpayer) go with it.
  const estimatedTaxDueNotes: string[] = isFigureKnown(picture.estimatedTaxDue)
    ? [...(picture.estimatedTaxDue.assumptions ?? [])]
    : [];

  // Estimated take-home comes from the engine's one selector; unknown stays unknown.
  const takeHomeFigure = selectTakeHome(profileFactsFromProfile(userProfile));
  const takeHome = isFigureKnown(takeHomeFigure) ? takeHomeFigure.value : null;
  const pensionPercentKnown =
    userProfile?.pensionPercent !== null &&
    userProfile?.pensionPercent !== undefined &&
    String(userProfile.pensionPercent) !== "";
  const monthlyContributionEst =
    userProfile?.annualSalary && pensionPercentKnown
      ? Math.round(
          (Number(userProfile.annualSalary) * Number(userProfile.pensionPercent)) / 100 / 12,
        )
      : null;

  // The hero's one delta compares today's net worth with the latest recorded month before this
  // one (E16 P6). Only that month and its total leave the loader.
  const currentMonth = londonMonth();
  const details = Array.isArray(accountDetails) ? accountDetails : [];
  const history = buildSnapshotHistory(
    Array.isArray(accounts) ? accounts : [],
    details,
    currentMonth,
  );
  const prior = history.series.filter((p) => !p.allCarried && p.month < currentMonth).at(-1);
  const netWorthPrior = prior ? { month: prior.month, netWorth: prior.netWorth } : null;

  return {
    user,
    netWorthPrior,
    // E30: the dashboard's monthly check-in card. Month keys only, no figures.
    checkIn: {
      currentMonth,
      lastRecordedMonth: latestRecordedMonth(details),
    },
    hasAccounts: Array.isArray(accounts) && accounts.length > 0,
    hasBudget:
      completedSteps.includes("budget") ||
      (Array.isArray(budgetEntries) && budgetEntries.some((e: any) => !e.isDefault)),
    hasSavings: savingsAccounts.length > 0,
    hasPension: pensionAccounts.length > 0 || completedSteps.includes("pension"),
    hasMortgageAccount: mortgageAccounts.length > 0,
    hasProfile: !!userProfile?.annualSalary,
    hasRunForecast: completedSteps.includes("forecast"),
    completedSteps,
    accountsData: {
      netWorth,
      totalAssets,
      totalLiabilities,
      liquidCash,
      // The seeded home Property account inside net worth, labelled "Home (your estimate)" (D3).
      homeEstimate,
      accountsCount: Array.isArray(accounts) ? accounts.length : 0,
    },
    budgetData: {
      budgetKnown: budget !== null,
      monthlyIncome,
      // Essentials plus discretionary; planned savings is its own line.
      monthlyExpenses: monthlyOutgoings,
      // Without an income row a surplus would only be minus the spending: unknown, as in MCP.
      monthlySurplus: budget?.hasIncome ? budget.surplus : null,
      // Essential commitments months of cover divides (essentials plus deduplicated debt).
      monthlyEssentials: monthsOfCover?.monthlyEssentials ?? null,
      budgetedSavings,
      livingExpenses: monthlyOutgoings,
      savingsRatePct:
        monthlyIncome > 0
          ? Math.min(
              100,
              Math.max(0, Math.round(((monthlyIncome - monthlyOutgoings) / monthlyIncome) * 100)),
            )
          : 0,
      safeToSpendWeekly: safeToSpend?.weekly ?? null,
      safeToSpendShortfall: safeToSpend?.monthlyShortfall ?? null,
      takeHomeMonthly: knownOrNull(picture.takeHome)?.monthly ?? null,
      monthsOfCover: monthsOfCover?.months ?? null,
    },
    savingsData: {
      totalSavingsBalance,
      totalMonthlyContributions,
      weightedInterestRate:
        weightedInterestRate === null ? null : Number(weightedInterestRate.toFixed(2)),
      accountsCount: savingsAccounts.length,
    },
    pensionData: {
      totalPensionBalance,
      potsCount: pensionAccounts.length,
      // 0% is a real contribution rate; only a missing profile value is null.
      employeePercent:
        userProfile?.pensionPercent == null ? null : Number(userProfile.pensionPercent),
      employerPercent:
        userProfile?.pensionEmployerPercent == null
          ? null
          : Number(userProfile.pensionEmployerPercent),
      isSalarySacrifice: userProfile?.isSalarySacrifice ?? null,
      monthlyContributionEst,
    },
    mortgageData: {
      mortgageBalance,
      interestRate: mortgageRate,
      remainingTermYears: mortgageTermYears,
      hasMortgageAccount: mortgageAccounts.length > 0,
    },
    forecastData: {
      totalAssets,
      monthlySavingRate: Math.max(0, monthlyIncome - monthlyOutgoings),
      annualSalary: userProfile?.annualSalary ?? null,
      estimatedTakeHome: takeHome?.monthly ?? null,
      takeHomeMissing: takeHome ? undefined : describeMissingTakeHome(userProfile),
      takeHomeAssumptions: isFigureKnown(takeHomeFigure) ? takeHomeFigure.assumptions : undefined,
    },
    taxData: {
      taxYear: getCurrentUKTaxYear(),
      totalIncome: totalTaxIncome,
      totalExpenses: totalTaxExpenses,
      netProfit,
      estimatedTaxDue,
      estimatedTaxDueNotes,
      recordsCount: currentYearRecords.length,
    },
    debtData: buildDebtSummary(portfolioSnapshot),
  };
};

const Index = (): ReactElement => {
  const data = useLoaderData<typeof loader>();
  const {
    user,
    hasAccounts,
    hasBudget,
    hasSavings,
    hasPension,
    hasMortgageAccount,
    hasProfile,
    hasRunForecast,
    completedSteps,
    accountsData,
    budgetData,
    savingsData,
    pensionData,
    mortgageData,
    forecastData,
    taxData,
    debtData,
    checkIn,
    netWorthPrior,
  } = data as any;

  if (user) {
    const safeAccountsData = accountsData || {
      netWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      liquidCash: 0,
      accountsCount: 0,
    };

    const safeBudgetData = budgetData || {
      budgetKnown: false,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlySurplus: null,
      monthlyEssentials: null,
      budgetedSavings: 0,
      livingExpenses: 0,
      savingsRatePct: 0,
      safeToSpendWeekly: null,
      safeToSpendShortfall: null,
      monthsOfCover: null,
    };

    return (
      <HomeDashboard
        accountsData={safeAccountsData}
        budgetData={safeBudgetData}
        checkIn={checkIn}
        netWorthPrior={netWorthPrior ?? null}
        checklistProps={{
          hasAccounts,
          hasBudget,
          hasMortgageAccount,
          hasPension,
          hasProfile,
          hasRunForecast,
          hasSavings,
          hasTax: (taxData?.recordsCount ?? 0) > 0,
          completedSteps,
        }}
        debtData={debtData ?? null}
        forecastData={forecastData}
        mortgageData={mortgageData}
        pensionData={pensionData}
        savingsData={savingsData}
        taxData={taxData}
        user={user}
      />
    );
  }

  return null;
};

export default Index;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
