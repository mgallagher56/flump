import type { PersonaFixture } from "../types.js";

/** New user: the salary is the only answer given. Every other fact is null, not defaulted. */
export const newUser: PersonaFixture = {
  profile: {
    annualSalary: 32000,
    employmentType: null,
    taxRegion: null,
    studentLoanPlans: null,
    pensionPercent: null,
    isSalarySacrifice: null,
  },
  accounts: [],
  details: [],
  budget: [],
  taxRecords: [],
};
