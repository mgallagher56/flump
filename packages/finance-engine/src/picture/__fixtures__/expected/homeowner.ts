import type { PersonaExpected } from "../types.js";

export const homeownerExpected: PersonaExpected = {
  takeHome: {
    status: "known", // salary, employment, pension %, salary sacrifice all answered
    provenance: "derived", // region and loan answered, so nothing assumed
    assumptions: [],
    region: "ENGLAND_NI_WALES",
    hasStudentLoanDeduction: false, // no student loan
    pensionDeduction: 2600, // 52,000 x 5%
  },
  portfolio: {
    netWorth: 241000, // 310,000 home estimate + 21,000 + 96,000 - 186,000 (D3 acceptance)
    totalAssets: 427000, // 310,000 + 21,000 + 96,000
    totalLiabilities: 186000, // the mortgage
    consumerDebt: 0,
    liquidCash: 21000,
    investments: 0,
    pensions: 96000,
    property: 310000, // the seeded "Home (your estimate)" Property account
    homeEstimate: 310000, // that same account, labelled; already inside property
    studentLoans: 0,
    mortgageBalance: 186000,
    debtItemIds: [], // a mortgage is not in the payoff set
  },
  budget: {
    income: 3249, // net salary = engine take-home monthly for 52,000, 5% pension, 2026/27
    essentials: 1780, // 1,050 + 330 + 400
    savings: 300,
    discretionary: 250,
    surplus: 919, // 3,249 - (1,780 + 300 + 250)
  },
  cover: {
    monthsOfCover: 11.8, // 21,000 / 1,780
    essentialCommitments: 1780,
    safeToSpendMonthly: 1169, // 3,249 - 1,780 - 300 savings
  },
};
