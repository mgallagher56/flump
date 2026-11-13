import type { PersonaFixture } from "../types.js";

/** Scottish employee on GBP 50,000 for 2026/27, same facts as an England equivalent. */
export const scottish: PersonaFixture = {
  profile: {
    annualSalary: 50000,
    employmentType: "employed",
    taxRegion: "SCOTLAND",
    studentLoanPlans: [],
    pensionPercent: 0,
    isSalarySacrifice: false,
  },
  accounts: [
    { id: "scot-current", name: "Current account", type: "Current", balance: 2750 },
    { id: "scot-saver", name: "Regular saver", type: "Saving", balance: 6000, interestRate: 4.0 },
  ],
  details: [],
  budget: [],
  taxRecords: [],
};
