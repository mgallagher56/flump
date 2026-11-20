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
    // 310,000 home estimate + 21,000 + 96,000 - 186,000 mortgage - 1,800 card - 7,200 loan
    netWorth: 232000,
    totalAssets: 427000, // 310,000 + 21,000 + 96,000
    totalLiabilities: 195000, // 186,000 mortgage + 1,800 card + 7,200 loan
    consumerDebt: 9000, // 1,800 card + 7,200 loan (E42 S8)
    liquidCash: 21000,
    investments: 0,
    pensions: 96000,
    property: 310000, // the seeded "Home (your estimate)" Property account
    homeEstimate: 310000, // that same account, labelled; already inside property
    studentLoans: 0,
    mortgageBalance: 186000,
    debtItemIds: ["homeowner-card", "homeowner-loan"], // a mortgage is not in the payoff set
  },
  budget: {
    income: 3249, // net salary = engine take-home monthly for 52,000, 5% pension, 2026/27
    essentials: 2060, // 1,050 + 330 + 400 + 280 card and loan payments
    savings: 300,
    discretionary: 250,
    surplus: 639, // 3,249 - (2,060 + 300 + 250)
  },
  cover: {
    monthsOfCover: 10.2, // 21,000 / 2,060 = 10.19
    // 1,780 non-debt essentials + the larger of debt minimums (60 + 220 = 280) and the debt row
    // (280), so the 280 counts once
    essentialCommitments: 2060,
    safeToSpendMonthly: 889, // 3,249 - 2,060 - 300 savings
  },
};
