import type {
  MonthlyHistoryExpectation,
  PersonaExpected,
  TaxYearRecordExpectation,
} from "../types.js";

export const heavyExpected: PersonaExpected = {
  takeHome: {
    status: "known",
    provenance: "derived",
    assumptions: [],
    region: "ENGLAND_NI_WALES",
    hasStudentLoanDeduction: true, // Plan 2 on 118,000 (well above the threshold)
    pensionDeduction: 9440, // 118,000 x 8%
  },
  portfolio: {
    // Assets: 3,850 + 9,200 + 14,000 + 36,000 + 88,000 + 34,000 + 380,000 + 260,000 + 1,500
    totalAssets: 826550, // joint current (-640) is not a positive asset; owed 1,500 is an asset
    // Liabilities: mortgages 355,000 + debts 16,800 + overdrawn 640
    totalLiabilities: 372440,
    netWorth: 454110, // 826,550 - 372,440; student loan excluded (D-5-B)
    consumerDebt: 17440, // PCP 9,800 + cards 6,300 + overdraft 700 + overdrawn 640
    liquidCash: 27050, // current 3,850 + savers 9,200 + 14,000; owed is not cash
    investments: 36000,
    pensions: 122000, // 88,000 + 34,000
    property: 640000, // 380,000 + 260,000
    studentLoans: 38200,
    mortgageBalance: 355000, // 205,000 + 150,000
    debtItemIds: ["heavy-pcp", "heavy-card-a", "heavy-card-b", "heavy-overdraft"],
  },
  budget: {
    income: 6990, // 5,390 net salary (engine take-home monthly) + 400 + 1,200
    essentials: 3245, // 1,150+560+190+140+45+35+30+520+265+70+120+120
    savings: 900, // 500 + 400
    discretionary: 650, // 250+220+55+45+80
    surplus: 2195, // 6,990 - (3,245 + 900 + 650)
  },
  cover: {
    monthsOfCover: 7.7, // 27,050 / (3,245 - 120 budgeted debt + max(410 minimums, 120))
    essentialCommitments: 3535,
    safeToSpendMonthly: 955, // 5,390 - 3,535 - 900
  },
};

/**
 * Record sums for four separate tax years. One monthly rent (1,200) and one monthly side income
 * (400) record run through all four; the annual records count once, in their own year.
 */
export const heavyTaxYearsExpected: Record<string, TaxYearRecordExpectation> = {
  "2023/24": {
    rentalIncomeGross: 14400, // 1,200 x 12
    rentalExpensesExclInterest: 2970, // insurance 380 + agent 1,440 + roof repair 1,150
    rentalMortgageInterest: 6000,
    rentalProfitBeforeInterest: 11430, // 14,400 - 2,970
    seIncomeGross: 4800, // 400 x 12
    seExpenses: 240,
    seProfit: 4560, // 4,800 - 240
    savingsInterestGross: 410,
    dividendIncomeGross: 300,
  },
  "2024/25": {
    rentalIncomeGross: 14400,
    rentalExpensesExclInterest: 1840, // insurance 400 + agent 1,440
    rentalMortgageInterest: 6250,
    rentalProfitBeforeInterest: 12560, // 14,400 - 1,840
    seIncomeGross: 4800,
    seExpenses: 240,
    seProfit: 4560,
    savingsInterestGross: 520,
    dividendIncomeGross: 420,
  },
  "2025/26": {
    rentalIncomeGross: 14400,
    rentalExpensesExclInterest: 2750, // insurance 420 + agent 1,440 + boiler 890
    rentalMortgageInterest: 6750,
    rentalProfitBeforeInterest: 11650, // 14,400 - 2,750
    seIncomeGross: 4800,
    seExpenses: 260,
    seProfit: 4540, // 4,800 - 260
    savingsInterestGross: 690,
    dividendIncomeGross: 510,
  },
  "2026/27": {
    rentalIncomeGross: 14400,
    rentalExpensesExclInterest: 1870, // insurance 430 + agent 1,440
    rentalMortgageInterest: 7000,
    rentalProfitBeforeInterest: 12530, // 14,400 - 1,870
    seIncomeGross: 4800,
    seExpenses: 260,
    seProfit: 4540,
    savingsInterestGross: 710,
    dividendIncomeGross: 480,
  },
};

/**
 * June to November 2026, carrying each account's last known value forward. Accounts tracked:
 * main current, instant saver, SIPP, home mortgage, overdrawn joint current (student loan excluded).
 */
// History only includes accounts that have detail rows (portfolio.ts filters on history.length > 0),
// so the end-state net worth here differs from getTotalNetWorth() by design today.
export const heavyHistoryExpected: MonthlyHistoryExpectation[] = [
  // Jun: 3,000 + 8,000 assets; mortgage 207,000 + joint 300 owed. SIPP has no row yet.
  { year: 2026, month: 6, totalAssets: 11000, totalLiabilities: 207300, netWorth: -196300 },
  // Jul: SIPP 30,000 appears; others carry forward. 41,000 - 207,300.
  { year: 2026, month: 7, totalAssets: 41000, totalLiabilities: 207300, netWorth: -166300 },
  // Aug: current 3,400 (the later duplicate row wins over 3,100). 3,400+8,000+30,000.
  { year: 2026, month: 8, totalAssets: 41400, totalLiabilities: 207300, netWorth: -165900 },
  // Sep: saver 9,200, mortgage 205,000, joint carries -300. 3,400+9,200+30,000.
  { year: 2026, month: 9, totalAssets: 42600, totalLiabilities: 205300, netWorth: -162700 },
  // Oct: SIPP 34,000, joint -640. 3,400+9,200+34,000; liabilities 205,000 + 640.
  { year: 2026, month: 10, totalAssets: 46600, totalLiabilities: 205640, netWorth: -159040 },
  // Nov: current 3,850. 3,850+9,200+34,000.
  { year: 2026, month: 11, totalAssets: 47050, totalLiabilities: 205640, netWorth: -158590 },
];
