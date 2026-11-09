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
  dashboardWidgets: ["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"],
  dashboardWidgetOrder: ["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"],
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

export function getSandboxPersonaData(persona: "debt" | "medium" | "high" | "wealth" = "debt") {
  if (persona === "debt") {
    const debtAccounts = [
      {
        id: "demo-debt-acc-1",
        name: "Monzo Current Account",
        type: "Current",
        balance: 950,
        currency: "GBP",
        interestRate: 0,
        monthlyContribution: null,
        isCurrent: true,
      },
      {
        id: "demo-debt-acc-2",
        name: "Barclaycard Platinum",
        type: "Credit Card",
        balance: -4500,
        currency: "GBP",
        interestRate: 24.9,
        monthlyContribution: 200,
        isCurrent: true,
      },
      {
        id: "demo-debt-acc-3",
        name: "Monzo Arranged Overdraft",
        type: "Overdraft",
        balance: -1200,
        currency: "GBP",
        interestRate: 39.9,
        monthlyContribution: 100,
        isCurrent: true,
      },
      {
        id: "demo-debt-acc-4",
        name: "HSBC Personal Loan",
        type: "Loan",
        balance: -2300,
        currency: "GBP",
        interestRate: 7.9,
        monthlyContribution: 150,
        isCurrent: true,
      },
    ];

    const budgetEntries = [
      {
        id: "b1",
        category: "Income",
        name: "Take-Home Salary (£34k)",
        amount: 2450,
        frequency: "monthly",
        isIncome: true,
      },
      {
        id: "b2",
        category: "housing",
        name: "Rent & Council Tax",
        amount: 950,
        frequency: "monthly",
        isIncome: false,
      },
      {
        id: "b3",
        category: "living",
        name: "Groceries & Commute",
        amount: 450,
        frequency: "monthly",
        isIncome: false,
      },
      {
        id: "b4",
        category: "debt",
        name: "Debt Repayments",
        amount: 450,
        frequency: "monthly",
        isIncome: false,
      },
    ];

    const userProfile: Partial<UserProfile> = {
      displayName: "Sam Jordan",
      firstName: "Sam",
      lastName: "Jordan",
      annualSalary: 34000,
      monthlyTakeHome: 2450,
      hasMortgage: false,
      hasBuyToLet: false,
      enabledPages: ["accounts", "budget", "debt", "pension", "tax"],
      dashboardWidgets: ["accounts", "budget", "debt"],
      dashboardWidgetSizes: {
        accounts: "normal",
        budget: "normal",
        debt: "normal",
      },
      dashboardWidgetOrder: ["accounts", "budget", "debt"],
    };

    return {
      isDemo: true,
      persona: "debt" as const,
      user: {
        id: "demo-persona-debt",
        email: "persona-debt@flump.co.uk",
        name: "Sam Jordan",
        firstName: "Sam",
        lastName: "Jordan",
      },
      userProfile,
      hasAccounts: true,
      hasBudget: true,
      hasSavings: false,
      hasPension: true,
      hasMortgageAccount: false,
      hasProfile: true,
      hasRunForecast: false,
      completedSteps: ["accounts", "debt", "budget"],
      accountsData: {
        netWorth: -7050,
        totalAssets: 950,
        totalLiabilities: 8000,
        accountsCount: 4,
        typeTotals: { Current: 950, "Credit Card": 4500, Overdraft: 1200, Loan: 2300 },
      },
      budgetData: {
        monthlyIncome: 2450,
        annualSalary: 34000,
        monthlyExpenses: 1850,
        monthlySurplus: 600,
        budgetedSavings: 0,
        livingExpenses: 1400,
        savingsRatePct: 0,
        runwayMonths: 0.7,
        runwayLabel: "Critical Runway",
        rawEntries: budgetEntries,
        rawAccounts: debtAccounts,
        rawAccountDetails: [],
      },
      savingsData: {
        totalSavingsBalance: 0,
        totalMonthlyContributions: 0,
        weightedInterestRate: 0,
        accountsCount: 0,
      },
      pensionData: {
        totalPensionBalance: 6500,
        potsCount: 1,
        employeePercent: 5.0,
        employerPercent: 3.0,
        isSalarySacrifice: false,
        monthlyContributionEst: 180,
      },
      mortgageData: {
        mortgageBalance: 0,
        interestRate: 0,
        remainingTermYears: 0,
        hasMortgageAccount: false,
      },
      forecastData: {
        totalAssets: 950,
        monthlySavingRate: 600,
        annualSalary: 34000,
        estimatedTakeHome: 2450,
      },
      taxData: {
        taxYear: getCurrentUKTaxYear(),
        totalIncome: 34000,
        totalExpenses: 0,
        netProfit: 34000,
        estimatedTaxDue: 4400,
        recordsCount: 1,
      },
      debtData: {
        totalDebt: 8000,
        highInterestDebt: 5700,
        highInterestCount: 2,
        debtFreeDate: "September 2026",
        interestSaved: 1420,
        monthlyMinimumTotal: 265,
      },
    };
  }

  if (persona === "medium") {
    const mediumAccounts = [
      {
        id: "demo-med-acc-1",
        name: "Monzo Current Account",
        type: "Current",
        balance: 2800,
        currency: "GBP",
        interestRate: 0,
        monthlyContribution: null,
        isCurrent: true,
      },
      {
        id: "demo-med-acc-2",
        name: "Marcus High-Yield Cash ISA",
        type: "Saving",
        balance: 12500,
        currency: "GBP",
        interestRate: 4.75,
        monthlyContribution: 450,
        isCurrent: true,
      },
      {
        id: "demo-med-acc-3",
        name: "Standard Life Workplace Pension",
        type: "Pension",
        balance: 28000,
        currency: "GBP",
        interestRate: 6.5,
        monthlyContribution: 300,
        isCurrent: true,
      },
    ];

    const budgetEntries = [
      {
        id: "mb1",
        category: "Income",
        name: "PAYE Take-Home Salary (£45k)",
        amount: 2820,
        frequency: "monthly",
        isIncome: true,
      },
      {
        id: "mb2",
        category: "housing",
        name: "Rent & Council Tax",
        amount: 1070,
        frequency: "monthly",
        isIncome: false,
      },
      {
        id: "mb3",
        category: "living",
        name: "Groceries & Utilities",
        amount: 350,
        frequency: "monthly",
        isIncome: false,
      },
      {
        id: "mb4",
        category: "lifestyle",
        name: "Transport & Leisure",
        amount: 250,
        frequency: "monthly",
        isIncome: false,
      },
      {
        id: "mb5",
        category: "savings",
        name: "Cash ISA Deposit",
        amount: 450,
        frequency: "monthly",
        isIncome: false,
      },
    ];

    const userProfile: Partial<UserProfile> = {
      displayName: "Jordan Taylor",
      firstName: "Jordan",
      lastName: "Taylor",
      annualSalary: 45000,
      monthlyTakeHome: 2820,
      hasMortgage: false,
      hasBuyToLet: false,
      enabledPages: ["accounts", "budget", "savings", "pension", "forecast"],
      dashboardWidgets: ["accounts", "budget", "savings", "pension", "forecast"],
      dashboardWidgetSizes: {
        accounts: "normal",
        budget: "normal",
        savings: "normal",
        pension: "normal",
        forecast: "normal",
      },
      dashboardWidgetOrder: ["accounts", "budget", "savings", "pension", "forecast"],
    };

    return {
      isDemo: true,
      persona: "medium" as const,
      user: {
        id: "demo-persona-medium",
        email: "jordan@flump.co.uk",
        name: "Jordan Taylor",
        firstName: "Jordan",
        lastName: "Taylor",
      },
      userProfile,
      hasAccounts: true,
      hasBudget: true,
      hasSavings: true,
      hasPension: true,
      hasMortgageAccount: false,
      hasProfile: true,
      hasRunForecast: true,
      completedSteps: ["accounts", "budget", "savings", "pension", "forecast"],
      accountsData: {
        netWorth: 43300,
        totalAssets: 43300,
        totalLiabilities: 0,
        accountsCount: 3,
        typeTotals: { Current: 2800, Saving: 12500, Pension: 28000 },
      },
      budgetData: {
        monthlyIncome: 2820,
        annualSalary: 45000,
        monthlyExpenses: 2120,
        monthlySurplus: 700,
        budgetedSavings: 450,
        livingExpenses: 1670,
        savingsRatePct: 41,
        runwayMonths: 7.5,
        runwayLabel: "Healthy Runway",
        rawEntries: budgetEntries,
        rawAccounts: mediumAccounts,
        rawAccountDetails: [],
      },
      savingsData: {
        totalSavingsBalance: 12500,
        totalMonthlyContributions: 450,
        weightedInterestRate: 4.75,
        accountsCount: 1,
      },
      pensionData: {
        totalPensionBalance: 28000,
        potsCount: 1,
        employeePercent: 5.0,
        employerPercent: 3.0,
        isSalarySacrifice: false,
        monthlyContributionEst: 300,
      },
      mortgageData: {
        mortgageBalance: 0,
        interestRate: 0,
        remainingTermYears: 0,
        hasMortgageAccount: false,
      },
      forecastData: {
        totalAssets: 43300,
        monthlySavingRate: 750,
        annualSalary: 45000,
        estimatedTakeHome: 2820,
      },
      taxData: {
        taxYear: getCurrentUKTaxYear(),
        totalIncome: 45000,
        totalExpenses: 0,
        netProfit: 45000,
        estimatedTaxDue: 6486,
        recordsCount: 1,
      },
      debtData: {
        totalDebt: 0,
        highInterestDebt: 0,
        highInterestCount: 0,
        debtFreeDate: "Debt Free",
        interestSaved: 0,
        monthlyMinimumTotal: 0,
      },
    };
  }

  // Persona C: £100k High Earner (Tax Trap & BTL)
  const highAccounts = [
    {
      id: "demo-high-acc-1",
      name: "Monzo Current Account",
      type: "Current",
      balance: 6500,
      currency: "GBP",
      interestRate: 0,
      monthlyContribution: null,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-2",
      name: "Vanguard LifeStrategy 80% Stocks & Shares ISA",
      type: "Investment",
      balance: 65000,
      currency: "GBP",
      interestRate: 7.4,
      monthlyContribution: 1200,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-3",
      name: "Marcus High-Yield Cash ISA",
      type: "Saving",
      balance: 22000,
      currency: "GBP",
      interestRate: 4.65,
      monthlyContribution: 300,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-4",
      name: "Standard Life SIPP / Workplace Pension",
      type: "Pension",
      balance: 110000,
      currency: "GBP",
      interestRate: 6.8,
      monthlyContribution: 1083,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-5",
      name: "Barclays Residential Mortgage",
      type: "Mortgage",
      balance: 310000,
      currency: "GBP",
      interestRate: 3.9,
      monthlyContribution: 1450,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-6",
      name: "NatWest Buy-to-Let Mortgage (Section 24)",
      type: "Mortgage",
      balance: 170000,
      currency: "GBP",
      interestRate: 4.8,
      monthlyContribution: 680,
      isCurrent: true,
    },
  ];

  const highBudgetEntries = [
    {
      id: "hb1",
      category: "Income",
      name: "PAYE Take-Home (£100k - £8k Pension Sacrifice)",
      amount: 5480,
      frequency: "monthly",
      isIncome: true,
    },
    {
      id: "hb2",
      category: "Income",
      name: "BTL Rental Gross Income",
      amount: 1200,
      frequency: "monthly",
      isIncome: true,
    },
    {
      id: "hb3",
      category: "housing",
      name: "Residential Mortgage",
      amount: 1450,
      frequency: "monthly",
      isIncome: false,
    },
    {
      id: "hb4",
      category: "housing",
      name: "BTL Interest Mortgage",
      amount: 680,
      frequency: "monthly",
      isIncome: false,
    },
    {
      id: "hb5",
      category: "bills",
      name: "Council Tax, Utilities & Insurance",
      amount: 450,
      frequency: "monthly",
      isIncome: false,
    },
    {
      id: "hb6",
      category: "living",
      name: "Family Living & Transport",
      amount: 1170,
      frequency: "monthly",
      isIncome: false,
    },
    {
      id: "hb7",
      category: "savings",
      name: "Vanguard S&S ISA Investment",
      amount: 1200,
      frequency: "monthly",
      isIncome: false,
    },
  ];

  const userProfile: Partial<UserProfile> = {
    displayName: "Morgan Vance",
    firstName: "Morgan",
    lastName: "Vance",
    annualSalary: 100000,
    monthlyTakeHome: 5480,
    hasSecondIncome: false,
    hasRentalIncome: true,
    rentalIncomeMonthly: 1200,
    hasMortgage: true,
    mortgageType: "repayment",
    hasBuyToLet: true,
    buyToLetCount: 1,
    buyToLetPropertyValue: 260000,
    buyToLetMonthlyRental: 1200,
    buyToLetMortgageBalance: 170000,
    buyToLetMortgageRate: 4.8,
    buyToLetMortgageType: "interest-only",
    pensionPercent: 8.0,
    pensionEmployerPercent: 5.0,
    isSalarySacrifice: true,
    enabledPages: ["accounts", "budget", "tax", "pension", "mortgage", "forecast"],
    dashboardWidgets: ["accounts", "budget", "tax", "pension", "mortgage", "forecast"],
    dashboardWidgetSizes: {
      accounts: "normal",
      budget: "normal",
      tax: "normal",
      pension: "normal",
      mortgage: "normal",
      forecast: "normal",
    },
    dashboardWidgetOrder: ["accounts", "budget", "tax", "pension", "mortgage", "forecast"],
  };

  return {
    isDemo: true,
    persona: "high" as const,
    user: {
      id: "demo-persona-high",
      email: "morgan@flump.co.uk",
      name: "Morgan Vance",
      firstName: "Morgan",
      lastName: "Vance",
    },
    userProfile,
    hasAccounts: true,
    hasBudget: true,
    hasSavings: true,
    hasPension: true,
    hasMortgageAccount: true,
    hasProfile: true,
    hasRunForecast: true,
    completedSteps: ["accounts", "budget", "tax", "pension", "mortgage", "forecast"],
    accountsData: {
      netWorth: 441500,
      totalAssets: 921500,
      totalLiabilities: 480000,
      accountsCount: 6,
      typeTotals: {
        Current: 6500,
        Investment: 65000,
        Saving: 22000,
        Pension: 110000,
        Mortgage: 480000,
      },
    },
    budgetData: {
      monthlyIncome: 6680,
      annualSalary: 100000,
      monthlyExpenses: 4950,
      monthlySurplus: 1730,
      budgetedSavings: 1200,
      livingExpenses: 3750,
      savingsRatePct: 44,
      runwayMonths: 12.0,
      runwayLabel: "Ironclad Runway",
      rawEntries: highBudgetEntries,
      rawAccounts: highAccounts,
      rawAccountDetails: [],
    },
    savingsData: {
      totalSavingsBalance: 87000,
      totalMonthlyContributions: 1500,
      weightedInterestRate: 6.8,
      accountsCount: 2,
    },
    pensionData: {
      totalPensionBalance: 110000,
      potsCount: 2,
      employeePercent: 8.0,
      employerPercent: 5.0,
      isSalarySacrifice: true,
      monthlyContributionEst: 1083,
    },
    mortgageData: {
      mortgageBalance: 310000,
      interestRate: 3.9,
      remainingTermYears: 22,
      hasMortgageAccount: true,
    },
    forecastData: {
      totalAssets: 921500,
      monthlySavingRate: 2283,
      annualSalary: 100000,
      estimatedTakeHome: 5480,
    },
    taxData: {
      taxYear: getCurrentUKTaxYear(),
      totalIncome: 114400,
      totalExpenses: 8160,
      netProfit: 106240,
      estimatedTaxDue: 26800,
      recordsCount: 2,
    },
    debtData: {
      totalDebt: 0,
      highInterestDebt: 0,
      highInterestCount: 0,
      debtFreeDate: "Debt Free",
      interestSaved: 0,
      monthlyMinimumTotal: 0,
    },
  };
}
