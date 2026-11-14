import { DEFAULT_NET_WORTH_BASIS } from "../../../net-worth-basis.js";
import type { PersonaFixture } from "../types.js";

/** New user: the salary is the only answer given. Every other fact is null, not defaulted. */
export const newUser: PersonaFixture = {
  netWorthBasis: DEFAULT_NET_WORTH_BASIS,
  profile: {
    annualSalary: 32000,
    employmentType: null,
    taxRegion: null,
    studentLoanPlans: null,
    pensionPercent: null,
    isSalarySacrifice: null,
    housingStatus: null,
    monthlyHousingCost: null,
    mortgageType: null,
    propertyOwnershipShare: null,
  },
  accounts: [],
  details: [],
  budget: [],
  taxRecords: [],
};
