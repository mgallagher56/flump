import { getCurrentUKTaxYear, PortfolioSnapshot } from "@flump/finance-engine";
import type { ReactElement } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from "react-router";
import { calculateNetTakeHome } from "~/components/budget/UserProfilePanel";
import { HomeDashboard } from "~/components/dashboard/HomeDashboard";
import LoggedOutHome from "~/components/home/LoggedOutHome";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { toMonthly } from "~/types/budget";
import { buildDebtSummary } from "~/utils/debtSummary";
import { isDemoMode } from "~/utils/demoData";
import { calculateRunwayStats } from "~/utils/runwayStorage";

export const meta: MetaFunction = (): { title: string }[] => [
  { title: "Flump | UK Wealth, Tax Optimization & Net Worth Engine" },
];

export const handle = {
  i18n: ["common", "home"],
};

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
    return {
      user: null,
      hasAccounts: false,
      hasBudget: false,
      hasSavings: false,
      hasPension: false,
      hasMortgageAccount: false,
      hasProfile: false,
      hasRunForecast: false,
      completedSteps: [] as string[],
      accountsData: null,
      budgetData: null,
      savingsData: null,
      pensionData: null,
      mortgageData: null,
      forecastData: null,
      taxData: null,
      debtData: null,
    };
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
  const mortgageRate =
    storedMortgageRate === null || storedMortgageRate === undefined || storedMortgageRate === ""
      ? null
      : Number(storedMortgageRate);

  // Tax data
  const currentYearRecords = Array.isArray(taxRecords) ? taxRecords : [];
  const totalTaxIncome = currentYearRecords
    .filter((r: any) => r.type === "income")
    .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  const totalTaxExpenses = currentYearRecords
    .filter((r: any) => r.type === "expense")
    .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  const netProfit = Math.max(0, totalTaxIncome - totalTaxExpenses);
  const estimatedTaxDue = netProfit > 0 ? netProfit * 0.29 : 0; // standard approx 20% tax + 9% Class 4 NI

  // Estimated take-home: only when salary, pension percent and salary-sacrifice status are all known.
  const pensionPercentKnown = userProfile?.pensionPercent != null;
  const salarySacrificeKnown = userProfile?.isSalarySacrifice != null;
  const takeHomeBreakdown =
    userProfile?.annualSalary && pensionPercentKnown && salarySacrificeKnown
      ? calculateNetTakeHome(
          userProfile.annualSalary,
          userProfile.employmentType,
          Number(userProfile.pensionPercent),
          Boolean(userProfile.isSalarySacrifice),
          userProfile.country || "GB",
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
      remainingTermYears: null,
      hasMortgageAccount: mortgageAccounts.length > 0,
    },
    forecastData: {
      totalAssets,
      monthlySavingRate: Math.max(0, monthlyIncome - livingExpenses),
      annualSalary: userProfile?.annualSalary ?? null,
      estimatedTakeHome: takeHomeBreakdown?.monthlyTakeHome ?? null,
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

  return <LoggedOutHome />;
};

export default Index;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
