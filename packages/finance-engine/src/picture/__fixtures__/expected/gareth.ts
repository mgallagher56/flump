import type { PersonaExpected } from "../types.js";

export const garethExpected: PersonaExpected = {
  takeHome: {
    status: "known",
    provenance: "derived",
    assumptions: [],
    region: "ENGLAND_NI_WALES",
    hasStudentLoanDeduction: false,
    pensionDeduction: 7200, // 72,000 x 10% = 600 a month, matches the workplace pot (D21)
  },
  portfolio: {
    netWorth: 824600, // 863,100 - 38,500
    totalAssets: 863100, // 3,100 + 15,000 + 88,000 + 142,000 + 205,000 + 410,000
    totalLiabilities: 38500, // mortgage
    consumerDebt: 0,
    liquidCash: 18100, // 3,100 + 15,000
    investments: 88000, // the ISA
    pensions: 347000, // 142,000 + 205,000
    property: 410000,
    studentLoans: 0,
    mortgageBalance: 38500,
    debtItemIds: [],
  },
  budget: {
    income: 4000, // net salary = engine take-home monthly for 72,000, 10% pension
    essentials: 2300, // 1,150 + 420 + 480 + 250
    savings: 1300, // 500 + 800
    discretionary: 300, // 100 + 200
    surplus: 100, // 4,000 - (2,300 + 1,300 + 300)
  },
};

/** Per-pot monthly contributions (D21): the pot value is stored on each account. */
export const garethContributionsExpected = {
  "gareth-workplace": 600, // 72,000 x 10% / 12
  "gareth-sipp": 800, // stored on the SIPP itself
  "gareth-isa": 500, // stored on the ISA
  pensionsMonthly: 1400, // 600 + 800
} as const;
