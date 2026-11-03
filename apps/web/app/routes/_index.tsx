import { getCurrentUKTaxYear } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FiDatabase, FiLock, FiPieChart, FiTrendingUp } from "react-icons/fi";
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  Link as RouterLink,
  redirect,
  useLoaderData,
} from "react-router";
import { calculateNetTakeHome } from "~/components/budget/UserProfilePanel";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { HomeDashboard } from "~/components/dashboard/HomeDashboard";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { toMonthly } from "~/types/budget";
import { calculateRunwayStats } from "~/utils/runwayStorage";
import { getAuthSession } from "~/utils/utils";

export const meta: MetaFunction = (): { title: string }[] => [
  { title: "Flump | Smart Personal Finance & Asset Tracker" },
];

export const handle = {
  i18n: ["common", "home"],
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: false });

  if (!user) {
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
    };
  } catch (error) {
    console.error("Home loader error:", error);
    return {
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
    };
  }
};

const Index = (): ReactElement => {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatCurrency();
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
  } = useLoaderData<typeof loader>();

  if (user && accountsData) {
    return (
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
        forecastData={forecastData}
        mortgageData={mortgageData}
        pensionData={pensionData}
        savingsData={savingsData}
        taxData={taxData}
        user={user}
      />
    );
  }

  const heroStyle = css({
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    gap: "24px",
    justifyContent: "center",
    marginLeft: "auto",
    marginRight: "auto",
    maxWidth: "3xl",
    marginBottom: "80px",
    paddingLeft: "16px",
    paddingRight: "16px",
    textAlign: "center",
  });

  const badgeStyle = css({
    borderRadius: "full",
    backgroundColor: "rgba(99, 99, 241, 0.15)",
    color: "primary",
    padding: "6px 12px",
    fontSize: "xs",
    fontWeight: "semibold",
  });

  const stackStyle = css({
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    gap: "16px",
    marginTop: "16px",
  });

  const featuresHeaderStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "48px",
    textAlign: "center",
  });

  const gridStyle = css({
    display: "grid",
    gap: "32px",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
  });

  const cardStyle = css({
    backgroundColor: "surface",
    border: "1px solid",
    borderColor: "border",
    borderRadius: "xl",
    padding: "24px",
    boxShadow: "sm",
    transition: "all 0.3s ease",
    _hover: {
      transform: "translateY(-5px)",
      boxShadow: "md",
      borderColor: "primary",
    },
  });

  const iconWrapperStyle = (color: "blue" | "green" | "purple" | "red") => {
    const bgMap = {
      blue: "rgba(59, 130, 246, 0.1)",
      green: "rgba(16, 185, 129, 0.1)",
      purple: "rgba(139, 92, 246, 0.1)",
      red: "rgba(239, 68, 68, 0.1)",
    };
    const textMap = {
      blue: "rgb(59, 130, 246)",
      green: "rgb(16, 185, 129)",
      purple: "rgb(139, 92, 246)",
      red: "rgb(239, 68, 68)",
    };
    return css({
      display: "flex",
      alignItems: "center",
      backgroundColor: bgMap[color],
      color: textMap[color],
      borderRadius: "lg",
      width: "48px",
      height: "48px",
      fontSize: "24px",
      justifyContent: "center",
      marginBottom: "16px",
    });
  };

  return (
    <FLPBox style={{ paddingTop: "24px", paddingBottom: "64px" }}>
      {/* Hero Section */}
      <div className={heroStyle}>
        <span className={badgeStyle}>✨ Introducing Flump 1.22</span>
        <FLPHeading as="h1" color="blue.500" size="4xl">
          Your entire financial universe, simplified.
        </FLPHeading>
        <FLPText color="text.muted" fontSize="lg">
          Aggregate your current accounts, savings, credit cards, mortgages, and loans in one
          unified dashboard. Track monthly changes, visualize trends, and reach your goals.
        </FLPText>
        <div className={stackStyle}>
          <FLPButton size="lg">
            <RouterLink style={{ color: "inherit", textDecoration: "none" }} to="/signUp">
              {t("signUp")}
            </RouterLink>
          </FLPButton>
          <FLPButton size="lg" variant="outline">
            <RouterLink style={{ color: "inherit", textDecoration: "none" }} to="/login">
              {t("logIn")}
            </RouterLink>
          </FLPButton>
        </div>
      </div>

      {/* Feature Grid */}
      <FLPBox style={{ marginBottom: "80px", paddingLeft: "16px", paddingRight: "16px" }}>
        <div className={featuresHeaderStyle}>
          <FLPHeading as="h2" color="blue.500" size="xl">
            Everything you need to master your money
          </FLPHeading>
          <FLPText color="text.muted" fontSize="md">
            Features built to give you total clarity and control over your net worth.
          </FLPText>
        </div>

        <div className={gridStyle}>
          {/* Card 1 */}
          <div className={cardStyle}>
            <div className={iconWrapperStyle("blue")}>
              <FiDatabase />
            </div>
            <FLPHeading as="h3" color="blue.500" mb={2} size="md">
              Wealth Aggregation
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Current accounts, savings, debts, and investments. View all of your assets and
              liabilities in one place.
            </FLPText>
          </div>

          {/* Card 2 */}
          <div className={cardStyle}>
            <div className={iconWrapperStyle("green")}>
              <FiTrendingUp />
            </div>
            <FLPHeading as="h3" color="green.500" mb={2} size="md">
              Interactive Analytics
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Beautiful historical data charts showing month-over-month progress and account balance
              changes over time.
            </FLPText>
          </div>

          {/* Card 3 */}
          <div className={cardStyle}>
            <div className={iconWrapperStyle("purple")}>
              <FiPieChart />
            </div>
            <FLPHeading as="h3" color="purple.500" mb={2} size="md">
              Net Worth Tracking
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Calculate your overall net worth automatically by subtracting your loans and mortgages
              from your cash assets.
            </FLPText>
          </div>

          {/* Card 4 */}
          <div className={cardStyle}>
            <div className={iconWrapperStyle("red")}>
              <FiLock />
            </div>
            <FLPHeading as="h3" color="destructive.500" mb={2} size="md">
              Secure Auth
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Powered by WorkOS AuthKit. Log in instantly with enterprise-grade SSO, social logins,
              or passwordless email codes.
            </FLPText>
          </div>
        </div>
      </FLPBox>
    </FLPBox>
  );
};

export default Index;
