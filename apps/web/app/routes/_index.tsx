import { getCurrentUKTaxYear } from "@repo/common";
import type { ReactElement } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from "react-router";
import { calculateNetTakeHome } from "~/components/budget/UserProfilePanel";
import { DemoModeBanner } from "~/components/dashboard/DemoModeBanner";
import { HomeDashboard } from "~/components/dashboard/HomeDashboard";
import LoggedOutHome from "~/components/home/LoggedOutHome";
import { toMonthly } from "~/types/budget";
import { getDemoDashboardData, isDemoMode } from "~/utils/demoData";
import { calculateRunwayStats } from "~/utils/runwayStorage";
import { getAuthSession } from "~/utils/utils";

export const meta: MetaFunction = (): { title: string }[] => [
  { title: "Flump | UK Wealth, Tax Optimization & Net Worth Engine" },
];

export const handle = {
  i18n: ["common", "home"],
};

export const loader = async (args: LoaderFunctionArgs) => {
  if (isDemoMode(args.request.url)) {
    return getDemoDashboardData();
  }

  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: false });

  if (!user) {
    return {
      isDemo: false,
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

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const headers = { Authorization: `Bearer ${accessToken || "mock-session-token"}` };

  try {
    const [accountsRes, profileRes, budgetRes, detailsRes, taxRes] = await Promise.all([
      fetch(`${apiUrl}/accounts`, { headers }),
      fetch(`${apiUrl}/user-profile`, { headers }),
      fetch(`${apiUrl}/budget-entries`, { headers }),
      fetch(`${apiUrl}/account-details`, { headers }),
      fetch(`${apiUrl}/tax-records`, { headers }),
    ]);

    const accounts = accountsRes.ok ? await accountsRes.json() : [];
    const userProfile = profileRes.ok ? await profileRes.json() : null;

    if (userProfile && userProfile.onboardingCompleted === false) {
      return redirect("/app/onboarding");
    }

    const budgetEntries = budgetRes.ok ? await budgetRes.json() : [];
    const accountDetails = detailsRes.ok ? await detailsRes.json() : [];
    const taxRecords = taxRes.ok ? await taxRes.json() : [];

    const completedSteps = (userProfile?.setupChecklistCompletedSteps as string[]) ?? [];

    const assetTypes = ["Current", "Saving", "Investment", "Pension", "Owed"];
    const totalAssets = Array.isArray(accounts)
      ? accounts
          .filter((a: any) => assetTypes.includes(a.type))
          .reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0)
      : 0;
    const totalLiabilities = Array.isArray(accounts)
      ? accounts
          .filter((a: any) => !assetTypes.includes(a.type))
          .reduce((sum: number, a: any) => sum + Math.abs(Number(a.balance) || 0), 0)
      : 0;

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
    const weightedInterestRate =
      totalSavingsBalance > 0
        ? savingsAccounts.reduce(
            (sum: number, a: any) =>
              sum +
              ((Number(a.balance) || 0) / totalSavingsBalance) * (Number(a.interestRate) || 0),
            0,
          )
        : Number(userProfile?.savingsDefaultInterestRate) || 5.0;

    // Pension accounts data
    const pensionAccounts = Array.isArray(accounts)
      ? accounts.filter((a: any) => a.type === "Pension")
      : [];
    const totalPensionBalance = pensionAccounts.reduce(
      (sum: number, a: any) => sum + (Number(a.balance) || 0),
      0,
    );

    // Mortgage data
    const mortgageAccounts = Array.isArray(accounts)
      ? accounts.filter((a: any) => a.type === "Mortgage")
      : [];
    const mortgageBalance = mortgageAccounts.reduce(
      (sum: number, a: any) => sum + Math.abs(Number(a.balance) || 0),
      0,
    );

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

    // Estimated take-home
    const takeHomeBreakdown = userProfile?.annualSalary
      ? calculateNetTakeHome(
          userProfile.annualSalary,
          userProfile.employmentType,
          userProfile.pensionPercent ?? 5,
          userProfile.isSalarySacrifice ?? true,
          userProfile.country || "GB",
        )
      : null;

    const defaultRunway = calculateRunwayStats({
      entries: budgetEntries,
      accounts,
      accountDetails,
      savedSettings: null,
    });

    return {
      isDemo: false,
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
        weightedInterestRate: Number(weightedInterestRate.toFixed(2)),
        accountsCount: savingsAccounts.length,
      },
      pensionData: {
        totalPensionBalance,
        potsCount: pensionAccounts.length,
        employeePercent: Number(userProfile?.pensionPercent) || 5.0,
        employerPercent: Number(userProfile?.pensionEmployerPercent) || 3.0,
        isSalarySacrifice: userProfile?.isSalarySacrifice ?? true,
        monthlyContributionEst: 0,
      },
      mortgageData: {
        mortgageBalance,
        interestRate: 4.5,
        remainingTermYears: 25,
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
      debtData: {
        totalDebt: totalLiabilities,
        highInterestDebt: totalLiabilities,
        highInterestCount: totalLiabilities > 0 ? 2 : 0,
        debtFreeDate: totalLiabilities > 0 ? "October 2026" : "Debt Free",
        interestSaved: Math.round(totalLiabilities * 0.18),
        monthlyMinimumTotal: Math.round(totalLiabilities * 0.025),
      },
    };
  } catch (error) {
    console.error("Home loader error:", error);
    return {
      isDemo: false,
      user,
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
};

const Index = (): ReactElement => {
  const data = useLoaderData<typeof loader>();
  const {
    user,
    isDemo,
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

  if (user && accountsData) {
    return (
      <>
        {isDemo && <DemoModeBanner />}
        <HomeDashboard
          accountsData={accountsData}
          budgetData={budgetData}
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
          debtData={debtData}
          forecastData={forecastData}
          mortgageData={mortgageData}
          pensionData={pensionData}
          savingsData={savingsData}
          taxData={taxData}
          user={user}
        />
      </>
    );
  }

  return <LoggedOutHome />;
};

export default Index;
