import type { PersonaExpected, TaxYearRecordExpectation } from "../types.js";

export const danExpected: PersonaExpected = {
  takeHome: {
    status: "known",
    provenance: "derived",
    assumptions: [],
    region: "ENGLAND_NI_WALES",
    hasStudentLoanDeduction: false,
    pensionDeduction: 2300, // 46,000 x 5%
  },
  portfolio: {
    netWorth: 96400, // 246,400 assets - 150,000 mortgage
    totalAssets: 246400, // 2,400 + 9,000 + 235,000
    totalLiabilities: 150000,
    consumerDebt: 0,
    liquidCash: 11400, // 2,400 + 9,000
    investments: 0,
    pensions: 0,
    property: 235000,
    studentLoans: 0,
    mortgageBalance: 150000,
    debtItemIds: [],
  },
  budget: {
    income: 4000, // 2,900 + 1,100
    essentials: 2202.5, // 900 + 562.5 + 260 + 300 + 180
    savings: 250,
    discretionary: 350,
    surplus: 1197.5, // 4,000 - (2,202.5 + 250 + 350)
  },
};

/** Record sums per tax year. Pure addition of the fixture records; no tax rates involved. */
export const danTaxYearsExpected: Record<string, TaxYearRecordExpectation> = {
  "2024/25": {
    // Every Dan record starts in April 2025 or later: nothing before that.
    rentalIncomeGross: 0,
    rentalExpensesExclInterest: 0,
    rentalMortgageInterest: 0,
    rentalProfitBeforeInterest: 0,
    seIncomeGross: 0,
    seExpenses: 0,
    seProfit: 0,
    savingsInterestGross: 0,
    dividendIncomeGross: 0,
  },
  "2025/26": {
    rentalIncomeGross: 13200, // 1,100 x 12 months
    rentalExpensesExclInterest: 2590, // insurance 420 + agent 110 x 12 = 1,320 + boiler 850
    rentalMortgageInterest: 6750, // the 2025/26 annual record, once
    rentalProfitBeforeInterest: 10610, // 13,200 - 2,590
    seIncomeGross: 0,
    seExpenses: 0,
    seProfit: 0,
    savingsInterestGross: 0,
    dividendIncomeGross: 0,
  },
  "2026/27": {
    rentalIncomeGross: 13200, // 1,100 x 12 months
    rentalExpensesExclInterest: 2390, // insurance 430 + agent 1,320 + redecorating 640
    rentalMortgageInterest: 7000, // the 2026/27 annual record, once (not 6,750 + 7,000)
    rentalProfitBeforeInterest: 10810, // 13,200 - 2,390
    seIncomeGross: 0,
    seExpenses: 0,
    seProfit: 0,
    savingsInterestGross: 0,
    dividendIncomeGross: 0,
  },
};
