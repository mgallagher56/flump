import type { BuildContextPackInput, FinancialBaseline } from "@flump/finance-engine";

const BASE: FinancialBaseline = {
  userId: "persona",
  taxYear: "2025/26",
  ukRegion: "ENGLAND_NI_WALES",
  employmentStatus: "PAYE",
  annualGrossSalary: 0,
  annualBonusOrSideIncome: 0,
  pensionContributionPct: 0,
  employerPensionMatchPct: 0,
  isSalarySacrifice: false,
  studentLoanPlan: "NONE",
  propertyOwnershipSharePct: 100,
  financialStage: "STAGE_2_BUFFER_BUILD",
  enabledModules: [],
};

/** A brand-new user: nothing entered, so every tool falls back to its own defaults. */
export const emptyUser: BuildContextPackInput = { baseline: { ...BASE } };

/** A renter with a salary and a credit card whose APR is unknown (no `interestRate`). */
export const renterWithUnknownAprCard: BuildContextPackInput = {
  baseline: {
    ...BASE,
    age: 29,
    annualGrossSalary: 38000,
    housingStatus: "RENTING",
    monthlyHousingCost: 950,
    monthlyOtherOutgoings: 800,
    totalCashSavings: 1200,
    pensionContributionPct: 4,
  },
  accounts: [
    { id: "cc_1", name: "Test Credit Card", type: "Credit Card", balance: 2400 },
    { id: "cur_1", name: "Test Current Account", type: "Current", balance: 1200 },
  ],
  budgetEntries: [],
};

/** A homeowner with a mortgage and an ISA. */
export const mortgageAndIsa: BuildContextPackInput = {
  baseline: {
    ...BASE,
    age: 41,
    annualGrossSalary: 72000,
    housingStatus: "MORTGAGE",
    monthlyHousingCost: 1400,
    monthlyOtherOutgoings: 1200,
    propertyValue: 410000,
    mortgageBalance: 255000,
    totalCashSavings: 18000,
    totalPensionPot: 90000,
    pensionContributionPct: 8,
    employerPensionMatchPct: 4,
    isSalarySacrifice: true,
  },
  accounts: [
    { id: "isa_1", name: "Test Stocks ISA", type: "ISA", balance: 32000 },
    { id: "cur_2", name: "Test Current Account", type: "Current", balance: 3100 },
  ],
  budgetEntries: [],
};
