import { getCurrentUKTaxYear, PortfolioSnapshot, type RawAccount } from "@flump/finance-engine";
import { isLiabilityType } from "~/containers/accounts/utils";
import type { UserProfile } from "~/hooks/useUserProfile";
import { buildDebtSummary } from "~/utils/debtSummary";
import { buildWorkspacePicture, knownOrNull } from "~/utils/financialPicture";

interface DemoAccount extends RawAccount {
  type: string;
  balance: number;
  monthlyContribution: number | null;
}

/**
 * Derived figures for a sample persona, built the way the dashboard loader builds them: from the
 * persona's own rows through the engine's financial picture (E23 section 2). Only the rows are
 * hand-written; net worth, budget totals, safe to spend and months of cover are never typed in.
 */
function demoFigures(
  accounts: readonly DemoAccount[],
  budgetEntries: readonly unknown[],
  userProfile: Partial<UserProfile>,
) {
  const snapshot = new PortfolioSnapshot([...accounts], []);
  const picture = buildWorkspacePicture(
    { userProfile, accounts, accountDetails: [], budgetEntries },
    { snapshot },
  );
  const { totalAssets, totalLiabilities, netWorth, liquidCash } = picture.netWorth;
  const budget = knownOrNull(picture.budget);
  const safeToSpend = knownOrNull(picture.safeToSpend);
  const monthsOfCover = knownOrNull(picture.monthsOfCover);
  const monthlyIncome = budget?.income ?? 0;
  const monthlyOutgoings = budget?.outgoings ?? 0;

  const typeTotals: Record<string, number> = {};
  for (const a of accounts) {
    typeTotals[a.type] =
      (typeTotals[a.type] ?? 0) + (isLiabilityType(a.type) ? Math.abs(a.balance) : a.balance);
  }
  const savingsAccounts = accounts.filter((a) => a.type === "Saving" || a.type === "Investment");
  const totalSavingsBalance = savingsAccounts.reduce((sum, a) => sum + a.balance, 0);

  return {
    accountsData: {
      netWorth,
      totalAssets,
      totalLiabilities,
      liquidCash,
      accountsCount: accounts.length,
      typeTotals,
    },
    budgetData: {
      budgetKnown: budget !== null,
      monthlyIncome,
      monthlyExpenses: monthlyOutgoings,
      monthlySurplus: budget?.hasIncome ? budget.surplus : null,
      monthlyEssentials: monthsOfCover?.monthlyEssentials ?? null,
      budgetedSavings: budget?.savings ?? 0,
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
      totalMonthlyContributions: savingsAccounts.reduce(
        (sum, a) => sum + (a.monthlyContribution ?? 0),
        0,
      ),
      weightedInterestRate:
        totalSavingsBalance > 0 ? Number(snapshot.getWeightedSavingsRate(0).toFixed(2)) : null,
      accountsCount: savingsAccounts.length,
    },
    monthlySavingRate: Math.max(0, monthlyIncome - monthlyOutgoings),
    totalPensionBalance: snapshot.getTotalPensions(),
    snapshot,
  };
}

export function isDemoMode(url: URL | string): boolean {
  try {
    const parsed = typeof url === "string" ? new URL(url, "http://localhost") : url;
    return parsed.searchParams.get("demo") === "true";
  } catch {
    return false;
  }
}

export function getSandboxPersonaData(persona: "debt" | "medium" | "high" | "wealth" = "medium") {
  if (persona === "debt") {
    const debtAccounts = [
      {
        id: "demo-debt-acc-1",
        name: "Current account",
        type: "Current",
        balance: 950,
        currency: "GBP",
        interestRate: 0,
        monthlyContribution: null,
        isCurrent: true,
      },
      {
        id: "demo-debt-acc-2",
        name: "Credit card",
        type: "Credit Card",
        balance: -4500,
        currency: "GBP",
        interestRate: 24.9,
        monthlyContribution: 200,
        isCurrent: true,
      },
      {
        id: "demo-debt-acc-3",
        name: "Arranged overdraft",
        type: "Overdraft",
        balance: -1200,
        currency: "GBP",
        interestRate: 39.9,
        monthlyContribution: 100,
        isCurrent: true,
      },
      {
        id: "demo-debt-acc-4",
        name: "Personal loan",
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
        amount: 2220,
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
        isEssential: true,
      },
      {
        id: "b3",
        category: "living",
        name: "Groceries & Commute",
        amount: 450,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
      {
        id: "b4",
        category: "debt",
        name: "Debt Repayments",
        amount: 450,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
    ];

    const userProfile: Partial<UserProfile> = {
      displayName: "Sam Jordan",
      firstName: "Sam",
      lastName: "Jordan",
      annualSalary: 34000,
      employmentType: "employed",
      pensionPercent: 5,
      pensionEmployerPercent: 3,
      isSalarySacrifice: false,
      monthlyTakeHome: 2220,
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

    const figures = demoFigures(debtAccounts, budgetEntries, userProfile);

    return {
      persona: "debt" as const,
      user: {
        id: "demo-persona-debt",
        email: "persona-debt@example.com",
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
      accountsData: figures.accountsData,
      budgetData: {
        ...figures.budgetData,
        annualSalary: 34000,
        rawEntries: budgetEntries,
        rawAccounts: debtAccounts,
        rawAccountDetails: [],
      },
      savingsData: figures.savingsData,
      pensionData: {
        // The pension pot is not one of this persona's accounts, so it is a profile figure.
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
        totalAssets: figures.accountsData.totalAssets,
        monthlySavingRate: figures.monthlySavingRate,
        annualSalary: 34000,
        estimatedTakeHome: figures.budgetData.takeHomeMonthly,
      },
      taxData: {
        taxYear: getCurrentUKTaxYear(),
        totalIncome: 34000,
        totalExpenses: 0,
        netProfit: 34000,
        estimatedTaxDue: 4400,
        recordsCount: 1,
      },
      // Computed by the engine from the persona's own accounts, so the date is relative to now.
      debtData: buildDebtSummary(figures.snapshot),
    };
  }

  // Persona B, the default: renting on a £39,000 salary (close to the UK median full-time
  // salary). 2025/26 England: income tax 5,286, employee NI 2,114.40, so 2,633/mo after tax;
  // 5% relief-at-source pension (130/mo net) leaves 2,503/mo. Pension 5% + 3% = 260/mo.
  if (persona === "medium") {
    const mediumAccounts = [
      {
        id: "demo-med-acc-1",
        name: "Current account",
        type: "Current",
        balance: 2800,
        currency: "GBP",
        interestRate: 0,
        monthlyContribution: null,
        isCurrent: true,
      },
      {
        id: "demo-med-acc-2",
        name: "Cash ISA",
        type: "Saving",
        balance: 12500,
        currency: "GBP",
        interestRate: 4.75,
        monthlyContribution: 300,
        isCurrent: true,
      },
      {
        id: "demo-med-acc-3",
        name: "Workplace pension",
        type: "Pension",
        balance: 28000,
        currency: "GBP",
        interestRate: 6.5,
        monthlyContribution: 260,
        isCurrent: true,
      },
    ];

    const budgetEntries = [
      {
        id: "mb1",
        category: "Income",
        name: "Take-home pay (£39,000 salary)",
        amount: 2503,
        frequency: "monthly",
        isIncome: true,
      },
      {
        id: "mb2",
        category: "housing",
        name: "Rent and council tax",
        amount: 1070,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
      {
        id: "mb3",
        category: "living",
        name: "Groceries and utilities",
        amount: 350,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
      {
        id: "mb4",
        category: "lifestyle",
        name: "Transport and leisure",
        amount: 250,
        frequency: "monthly",
        isIncome: false,
        isEssential: false,
      },
      {
        id: "mb5",
        category: "savings",
        name: "Cash ISA deposit",
        amount: 300,
        frequency: "monthly",
        isIncome: false,
      },
    ];

    const userProfile: Partial<UserProfile> = {
      displayName: "Jordan Taylor",
      firstName: "Jordan",
      lastName: "Taylor",
      annualSalary: 39000,
      employmentType: "employed",
      pensionPercent: 5,
      pensionEmployerPercent: 3,
      isSalarySacrifice: false,
      monthlyTakeHome: 2503,
      hasMortgage: false,
      hasBuyToLet: false,
      enabledPages: ["accounts", "budget", "savings", "pension"],
      dashboardWidgets: ["accounts", "budget", "savings", "pension"],
      dashboardWidgetSizes: {
        accounts: "normal",
        budget: "normal",
        savings: "normal",
        pension: "normal",
      },
      dashboardWidgetOrder: ["accounts", "budget", "savings", "pension"],
    };

    const figures = demoFigures(mediumAccounts, budgetEntries, userProfile);

    return {
      persona: "medium" as const,
      user: {
        id: "demo-persona-medium",
        email: "jordan@example.com",
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
      completedSteps: ["accounts", "budget", "savings", "pension"],
      accountsData: figures.accountsData,
      budgetData: {
        ...figures.budgetData,
        annualSalary: 39000,
        rawEntries: budgetEntries,
        rawAccounts: mediumAccounts,
        rawAccountDetails: [],
      },
      savingsData: figures.savingsData,
      pensionData: {
        totalPensionBalance: figures.totalPensionBalance,
        potsCount: 1,
        employeePercent: 5.0,
        employerPercent: 3.0,
        isSalarySacrifice: false,
        monthlyContributionEst: 260,
      },
      mortgageData: {
        mortgageBalance: 0,
        interestRate: 0,
        remainingTermYears: 0,
        hasMortgageAccount: false,
      },
      forecastData: {
        totalAssets: figures.accountsData.totalAssets,
        monthlySavingRate: figures.monthlySavingRate,
        annualSalary: 39000,
        estimatedTakeHome: figures.budgetData.takeHomeMonthly,
      },
      taxData: {
        taxYear: getCurrentUKTaxYear(),
        totalIncome: 39000,
        totalExpenses: 0,
        netProfit: 39000,
        estimatedTaxDue: 5286,
        recordsCount: 1,
      },
      debtData: null,
    };
  }

  // Persona C: higher earner with a buy-to-let (shown last in the sandbox, E31)
  const highAccounts = [
    {
      id: "demo-high-acc-1",
      name: "Current account",
      type: "Current",
      balance: 6500,
      currency: "GBP",
      interestRate: 0,
      monthlyContribution: null,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-2",
      name: "Stocks and Shares ISA",
      type: "Investment",
      balance: 65000,
      currency: "GBP",
      interestRate: 7.4,
      monthlyContribution: 1200,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-3",
      name: "Cash ISA",
      type: "Saving",
      balance: 22000,
      currency: "GBP",
      interestRate: 4.65,
      monthlyContribution: 300,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-4",
      name: "Workplace pension and SIPP",
      type: "Pension",
      balance: 110000,
      currency: "GBP",
      interestRate: 6.8,
      monthlyContribution: 1083,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-5",
      name: "Residential mortgage",
      type: "Mortgage",
      balance: 310000,
      currency: "GBP",
      interestRate: 3.9,
      monthlyContribution: 1450,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-6",
      name: "Buy-to-let mortgage (Section 24)",
      type: "Mortgage",
      balance: 170000,
      currency: "GBP",
      interestRate: 4.8,
      monthlyContribution: 680,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-7",
      name: "Home",
      type: "Property",
      balance: 458000,
      currency: "GBP",
      interestRate: null,
      monthlyContribution: null,
      isCurrent: true,
    },
    {
      id: "demo-high-acc-8",
      name: "Buy-to-let property",
      type: "Property",
      balance: 260000,
      currency: "GBP",
      interestRate: null,
      monthlyContribution: null,
      isCurrent: true,
    },
  ];

  const highBudgetEntries = [
    {
      id: "hb1",
      category: "Income",
      name: "PAYE Take-Home (£100k - £8k Pension Sacrifice)",
      amount: 5326,
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
      isEssential: true,
    },
    {
      id: "hb4",
      category: "housing",
      name: "BTL Interest Mortgage",
      amount: 680,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
    },
    {
      id: "hb5",
      category: "bills",
      name: "Council Tax, Utilities & Insurance",
      amount: 450,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
    },
    {
      id: "hb6",
      category: "living",
      name: "Family Living & Transport",
      amount: 1170,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
    },
    {
      id: "hb7",
      category: "savings",
      name: "Stocks and Shares ISA contribution",
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
    employmentType: "employed",
    monthlyTakeHome: 5326,
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
    enabledPages: ["accounts", "budget", "tax", "pension", "mortgage"],
    dashboardWidgets: ["accounts", "budget", "tax", "pension", "mortgage"],
    dashboardWidgetSizes: {
      accounts: "normal",
      budget: "normal",
      tax: "normal",
      pension: "normal",
      mortgage: "normal",
    },
    dashboardWidgetOrder: ["accounts", "budget", "tax", "pension", "mortgage"],
  };

  const figures = demoFigures(highAccounts, highBudgetEntries, userProfile);
  const residentialMortgage = highAccounts.find((a) => a.id === "demo-high-acc-5")!;

  return {
    persona: "high" as const,
    user: {
      id: "demo-persona-high",
      email: "morgan@example.com",
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
    completedSteps: ["accounts", "budget", "tax", "pension", "mortgage"],
    accountsData: figures.accountsData,
    budgetData: {
      ...figures.budgetData,
      annualSalary: 100000,
      rawEntries: highBudgetEntries,
      rawAccounts: highAccounts,
      rawAccountDetails: [],
    },
    savingsData: figures.savingsData,
    pensionData: {
      totalPensionBalance: figures.totalPensionBalance,
      potsCount: 2,
      employeePercent: 8.0,
      employerPercent: 5.0,
      isSalarySacrifice: true,
      monthlyContributionEst: 1083,
    },
    mortgageData: {
      mortgageBalance: residentialMortgage.balance,
      interestRate: residentialMortgage.interestRate,
      remainingTermYears: 22,
      hasMortgageAccount: true,
    },
    forecastData: {
      totalAssets: figures.accountsData.totalAssets,
      monthlySavingRate: figures.monthlySavingRate,
      annualSalary: 100000,
      estimatedTakeHome: figures.budgetData.takeHomeMonthly,
    },
    taxData: {
      taxYear: getCurrentUKTaxYear(),
      totalIncome: 114400,
      totalExpenses: 8160,
      netProfit: 106240,
      estimatedTaxDue: 26800,
      recordsCount: 2,
    },
    debtData: null,
  };
}
