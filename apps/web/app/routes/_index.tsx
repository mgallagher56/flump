import {
  getCurrentUKTaxYear,
  getTaxYearForRecordDate,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import type { ReactElement } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from "react-router";
import { calculateNetTakeHome } from "~/components/budget/UserProfilePanel";
import { HomeDashboard } from "~/features/dashboard/components/HomeDashboard";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { toMonthly } from "~/types/budget";
import { buildDebtSummary } from "~/utils/debtSummary";
import { isDemoMode } from "~/utils/demoData";
import { getMarketingUrl } from "~/utils/marketingUrl";
import { calculateRunwayStats } from "~/utils/runwayStorage";

export const meta: MetaFunction = (): { title: string }[] => [
  { title: "Flump | UK Wealth, Tax Optimization & Net Worth Engine" },
];

export const handle = {
  i18n: ["common"],
};

type TakeHomeProfile = {
  annualSalary?: number | string | null;
  employmentType?: string | null;
  pensionPercent?: number | string | null;
  isSalarySacrifice?: boolean | null;
} | null;

const isBlank = (value: unknown): boolean => value === null || value === undefined || value === "";

/**
 * What the user must add for take-home to be computed, all at once. Undefined when the salary
 * itself is unset (the widget then just says "Not set").
 */
export function describeMissingTakeHome(profile: TakeHomeProfile | undefined): string | undefined {
  if (!profile?.annualSalary) return undefined;
  const missing: string[] = [];
  if (profile.employmentType !== "employed" && profile.employmentType !== "self-employed") {
    missing.push("employment type");
  }
  if (isBlank(profile.pensionPercent)) missing.push("pension percentage");
  if (profile.isSalarySacrifice == null) missing.push("salary sacrifice status");
  if (missing.length === 0) return undefined;
  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  return `Add ${list}`;
}

export const loader = async (args: LoaderFunctionArgs) => {
  const {
    accounts,
    userProfile,
    budgetEntries,
    accountDetails,
    taxRecords,
    user,
    portfolioSnapshot: preloadedSnapshot,
  } = await loadWorkspaceSnapshot(args, {
    ensureSignedIn: false,
    includeBudget: true,
    includeTax: true,
    includePortfolioSnapshot: true,
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

  const portfolioSnapshot = new PortfolioSnapshot(accounts, accountDetails);
  const totalAssets = preloadedSnapshot?.totalAssets ?? portfolioSnapshot.getTotalAssets();
  const totalLiabilities =
    preloadedSnapshot?.totalLiabilities ?? portfolioSnapshot.getTotalLiabilities();

  const monthlyIncome = Array.isArray(budgetEntries)
    ? budgetEntries
        .filter((e: any) => e.isIncome)
        .reduce((sum: number, e: any) => sum + toMonthly(e), 0)
    : 0;
  const monthlyExpenses = Array.isArray(budgetEntries)
    ? budgetEntries
        .filter((e: any) => !e.isIncome)
        .reduce((sum: number, e: any) => sum + toMonthly(e), 0)
    : 0;

  const budgetedSavings = Array.isArray(budgetEntries)
    ? budgetEntries
        .filter((e: any) => !e.isIncome && e.category === "savings")
        .reduce((sum: number, e: any) => sum + toMonthly(e), 0)
    : 0;

  const livingExpenses = Array.isArray(budgetEntries)
    ? budgetEntries
        .filter((e: any) => !e.isIncome && e.category !== "savings")
        .reduce((sum: number, e: any) => sum + toMonthly(e), 0)
    : 0;

  // Accounts Breakdown
  const typeTotals: Record<string, number> = {};
  if (Array.isArray(accounts)) {
    accounts.forEach((a: any) => {
      const t = a.type || "Other";
      typeTotals[t] = (typeTotals[t] || 0) + Math.abs(Number(a.balance) || 0);
    });
  }

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
  // Only records dated in the current tax year (an annual record belongs to the year containing
  // its date, decision D-7-A); other years must not leak into the headline figures.
  const currentTaxYear = getCurrentUKTaxYear();
  const currentYearRecords = (Array.isArray(taxRecords) ? taxRecords : []).filter(
    (r: any) => getTaxYearForRecordDate(r.date) === currentTaxYear,
  );
  const totalTaxIncome = currentYearRecords
    .filter((r: any) => r.type === "income")
    .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  const totalTaxExpenses = currentYearRecords
    .filter((r: any) => r.type === "expense")
    .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  const netProfit = Math.max(0, totalTaxIncome - totalTaxExpenses);
  // Not calculated yet: the old flat 29% across every year's records was an invented figure.
  const estimatedTaxDue: number | null = null;

  // Estimated take-home: only when salary, pension percent and salary-sacrifice status are all known.
  const pensionPercentKnown = !isBlank(userProfile?.pensionPercent);
  const salarySacrificeKnown = userProfile?.isSalarySacrifice != null;
  const takeHomeInputsKnown = pensionPercentKnown && salarySacrificeKnown;
  const takeHomeBreakdown =
    userProfile?.annualSalary && takeHomeInputsKnown
      ? calculateNetTakeHome(
          userProfile.annualSalary,
          userProfile.employmentType,
          Number(userProfile.pensionPercent),
          Boolean(userProfile.isSalarySacrifice),
        )
      : null;
  const monthlyContributionEst =
    userProfile?.annualSalary && pensionPercentKnown
      ? Math.round(
          (Number(userProfile.annualSalary) * Number(userProfile.pensionPercent)) / 100 / 12,
        )
      : null;

  const defaultRunway = calculateRunwayStats({
    entries: budgetEntries,
    accounts,
    accountDetails,
    savedSettings: null,
  });

  return {
    user,
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
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      accountsCount: Array.isArray(accounts) ? accounts.length : 0,
      typeTotals,
    },
    budgetData: {
      monthlyIncome,
      monthlyExpenses,
      monthlySurplus: monthlyIncome - monthlyExpenses,
      budgetedSavings,
      livingExpenses,
      savingsRatePct:
        monthlyIncome > 0
          ? Math.min(
              100,
              Math.max(0, Math.round(((monthlyIncome - livingExpenses) / monthlyIncome) * 100)),
            )
          : 0,
      runwayMonths: defaultRunway.runwayMonths,
      runwayLabel: defaultRunway.shortLabel,
      rawEntries: budgetEntries,
      rawAccounts: accounts,
      rawAccountDetails: accountDetails,
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
      monthlySavingRate: Math.max(0, monthlyIncome - livingExpenses),
      annualSalary: userProfile?.annualSalary ?? null,
      estimatedTakeHome: takeHomeBreakdown?.monthlyTakeHome ?? null,
      takeHomeMissing: takeHomeBreakdown ? undefined : describeMissingTakeHome(userProfile),
    },
    taxData: {
      taxYear: getCurrentUKTaxYear(),
      totalIncome: totalTaxIncome,
      totalExpenses: totalTaxExpenses,
      netProfit,
      estimatedTaxDue,
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
  } = data as any;

  if (user) {
    const safeAccountsData = accountsData || {
      netWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      accountsCount: 0,
      typeTotals: {},
    };

    const safeBudgetData = budgetData || {
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlySurplus: 0,
      budgetedSavings: 0,
      livingExpenses: 0,
      savingsRatePct: 0,
      runwayMonths: 0,
      runwayLabel: "0 mo",
      rawEntries: [],
      rawAccounts: [],
      rawAccountDetails: [],
    };

    return (
      <HomeDashboard
        accountsData={safeAccountsData}
        budgetData={safeBudgetData}
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
