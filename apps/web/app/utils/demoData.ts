import { getCurrentUKTaxYear } from "@repo/common";
import type { UserProfile } from "~/hooks/useUserProfile";
import { toMonthly } from "~/types/budget";
import { calculateRunwayStats } from "~/utils/runwayStorage";

export const DEMO_USER = {
  id: "demo-user-uk",
  email: "demo@flump.app",
  name: "Alex Morgan",
  firstName: "Alex",
  lastName: "Morgan",
};

export const DEMO_PROFILE: UserProfile = {
  id: "demo-profile-uk",
  userId: "demo-user-uk",
  displayName: "Alex Morgan",
  firstName: "Alex",
  lastName: "Morgan",
  email: "demo@flump.app",
  avatarUrl: null,
  currency: "GBP",
  country: "GB",
  employmentType: "employed",
  annualSalary: 85000,
  monthlyTakeHome: 4820,
  hasSecondIncome: false,
  secondIncomeMonthly: null,
  hasRentalIncome: true,
  rentalIncomeMonthly: 1200,
  hasMortgage: true,
  mortgageType: "repayment",
  propertyOwnershipShare: 100.0,
  hasBuyToLet: true,
  buyToLetCount: 1,
  buyToLetPropertyValue: 240000,
  buyToLetMonthlyRental: 1200,
  buyToLetMortgageBalance: 160000,
  buyToLetMortgageRate: 4.8,
  buyToLetMortgageType: "interest-only",
  pensionPercent: 7,
  pensionEmployerPercent: 5,
  isSalarySacrifice: true,
  isSalarySacrificeEmployerNi: false,
  monthlySavingsTarget: 800,
  savingsAllocationMode: "total",
  savingsDefaultInterestRate: 4.65,
  setupChecklistCompletedSteps: [
    "accounts",
    "budget",
    "savings",
    "pension",
    "mortgage",
    "forecast",
    "tax",
  ],
  enabledPages: ["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"],
  dashboardWidgets: [
    "financialHealth",
    "accounts",
    "budget",
    "savings",
    "pension",
    "mortgage",
    "forecast",
    "tax",
  ],
  dashboardWidgetOrder: [
    "financialHealth",
    "accounts",
    "budget",
    "savings",
    "pension",
    "mortgage",
    "forecast",
    "tax",
  ],
  dashboardWidgetSizes: {},
  dashboardWidgetConfig: {},
  onboardingCompleted: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

export const DEMO_ACCOUNTS = [
  {
    id: "demo-acc-1",
    name: "Monzo Current Account",
    type: "Current",
    balance: 4500,
    currency: "GBP",
    interestRate: 0,
    monthlyContribution: null,
    isCurrent: true,
  },
  {
    id: "demo-acc-2",
    name: "Vanguard LifeStrategy 80% Stocks & Shares ISA",
    type: "Investment",
    balance: 42000,
    currency: "GBP",
    interestRate: 7.2,
    monthlyContribution: 500,
    isCurrent: true,
  },
  {
    id: "demo-acc-3",
    name: "Marcus High-Yield Cash ISA",
    type: "Saving",
    balance: 18500,
    currency: "GBP",
    interestRate: 4.65,
    monthlyContribution: 300,
    isCurrent: true,
  },
  {
    id: "demo-acc-4",
    name: "Standard Life Workplace Pension",
    type: "Pension",
    balance: 78000,
    currency: "GBP",
    interestRate: 6.5,
    monthlyContribution: 850,
    isCurrent: true,
  },
  {
    id: "demo-acc-5",
    name: "Barclays Residential Mortgage",
    type: "Mortgage",
    balance: 265000,
    currency: "GBP",
    interestRate: 3.8,
    monthlyContribution: 1350,
    isCurrent: true,
  },
];

export const DEMO_BUDGET_ENTRIES = [
  {
    id: "demo-b-1",
    category: "Income",
    name: "PAYE Take-Home Salary",
    amount: 4820,
    frequency: "monthly",
    isIncome: true,
  },
  {
    id: "demo-b-2",
    category: "housing",
    name: "Residential Mortgage",
    amount: 1350,
    frequency: "monthly",
    isIncome: false,
  },
  {
    id: "demo-b-3",
    category: "bills",
    name: "Council Tax & Energy Bills",
    amount: 380,
    frequency: "monthly",
    isIncome: false,
  },
  {
    id: "demo-b-4",
    category: "living",
    name: "Groceries & Transport",
    amount: 450,
    frequency: "monthly",
    isIncome: false,
  },
  {
    id: "demo-b-5",
    category: "savings",
    name: "Vanguard ISA Contribution",
    amount: 500,
    frequency: "monthly",
    isIncome: false,
  },
  {
    id: "demo-b-6",
    category: "savings",
    name: "Marcus Cash ISA",
    amount: 300,
    frequency: "monthly",
    isIncome: false,
  },
];

export const DEMO_ACCOUNT_DETAILS = DEMO_ACCOUNTS.flatMap((acc) => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => ({
    id: `demo-det-${acc.id}-${i}`,
    account_id: acc.id,
    accountId: acc.id,
    month: i + 1,
    year: currentYear,
    value: acc.balance,
  }));
});

export const DEMO_TAX_RECORDS = [
  {
    id: "demo-tax-1",
    userId: "demo-user-uk",
    source: "rental",
    type: "income",
    category: "rental_income",
    name: "Monthly Rental Receipts",
    amount: 14400,
    frequency: "annual",
    date: `${new Date().getFullYear()}-05-01`,
  },
  {
    id: "demo-tax-2",
    userId: "demo-user-uk",
    source: "rental",
    type: "expense",
    category: "mortgage_interest",
    name: "BTL Mortgage Interest",
    amount: 7680,
    frequency: "annual",
    date: `${new Date().getFullYear()}-05-01`,
  },
];

export function isDemoMode(url: URL | string): boolean {
  try {
    const parsed = typeof url === "string" ? new URL(url, "http://localhost") : url;
    return parsed.searchParams.get("demo") === "true";
  } catch {
    return false;
  }
}

export function getDemoDashboardData() {
  const accounts = DEMO_ACCOUNTS;
  const userProfile = DEMO_PROFILE;
  const budgetEntries = DEMO_BUDGET_ENTRIES;
  const accountDetails = DEMO_ACCOUNT_DETAILS;
  const taxRecords = DEMO_TAX_RECORDS;

  const completedSteps = (userProfile?.setupChecklistCompletedSteps as string[]) ?? [];

  const assetTypes = ["Current", "Saving", "Investment", "Pension", "Owed"];
  const totalAssets = accounts
    .filter((a: any) => assetTypes.includes(a.type))
    .reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
  const totalLiabilities = accounts
    .filter((a: any) => !assetTypes.includes(a.type))
    .reduce((sum: number, a: any) => sum + Math.abs(Number(a.balance) || 0), 0);

  const monthlyIncome = budgetEntries
    .filter((e: any) => e.isIncome)
    .reduce((sum: number, e: any) => sum + toMonthly(e), 0);
  const monthlyExpenses = budgetEntries
    .filter((e: any) => !e.isIncome)
    .reduce((sum: number, e: any) => sum + toMonthly(e), 0);

  const budgetedSavings = budgetEntries
    .filter((e: any) => !e.isIncome && e.category === "savings")
    .reduce((sum: number, e: any) => sum + toMonthly(e), 0);

  const livingExpenses = budgetEntries
    .filter((e: any) => !e.isIncome && e.category !== "savings")
    .reduce((sum: number, e: any) => sum + toMonthly(e), 0);

  const typeTotals: Record<string, number> = {};
  accounts.forEach((a: any) => {
    const t = a.type || "Other";
    typeTotals[t] = (typeTotals[t] || 0) + Math.abs(Number(a.balance) || 0);
  });

  const savingsAccounts = accounts.filter(
    (a: any) => a.type === "Saving" || a.type === "Investment",
  );
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
            sum + ((Number(a.balance) || 0) / totalSavingsBalance) * (Number(a.interestRate) || 0),
          0,
        )
      : Number(userProfile?.savingsDefaultInterestRate) || 5.0;

  const pensionAccounts = accounts.filter((a: any) => a.type === "Pension");
  const totalPensionBalance = pensionAccounts.reduce(
    (sum: number, a: any) => sum + (Number(a.balance) || 0),
    0,
  );

  const mortgageAccounts = accounts.filter((a: any) => a.type === "Mortgage");
  const mortgageBalance = mortgageAccounts.reduce(
    (sum: number, a: any) => sum + Math.abs(Number(a.balance) || 0),
    0,
  );

  const currentYearRecords = taxRecords;
  const totalTaxIncome = currentYearRecords
    .filter((r: any) => r.type === "income")
    .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  const totalTaxExpenses = currentYearRecords
    .filter((r: any) => r.type === "expense")
    .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  const netProfit = Math.max(0, totalTaxIncome - totalTaxExpenses);
  const estimatedTaxDue = netProfit > 0 ? netProfit * 0.29 : 0;

  const defaultRunway = calculateRunwayStats({
    entries: budgetEntries,
    accounts,
    accountDetails,
    savedSettings: null,
  });

  return {
    isDemo: true,
    user: DEMO_USER,
    hasAccounts: true,
    hasBudget: true,
    hasSavings: true,
    hasPension: true,
    hasMortgageAccount: true,
    hasProfile: true,
    hasRunForecast: true,
    completedSteps,
    accountsData: {
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      accountsCount: accounts.length,
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
      monthlyContributionEst: 850,
    },
    mortgageData: {
      mortgageBalance,
      interestRate: 3.8,
      remainingTermYears: 23,
      hasMortgageAccount: true,
    },
    forecastData: {
      totalAssets,
      monthlySavingRate: Math.max(0, monthlyIncome - livingExpenses),
      annualSalary: userProfile?.annualSalary ?? null,
      estimatedTakeHome: 4820,
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
}
