import type { ProfileFacts } from "../../input.js";
import type { PersonaFixture } from "../types.js";

function employee(annualSalary: number): ProfileFacts {
  return {
    annualSalary,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
    pensionPercent: 0,
    isSalarySacrifice: false,
  };
}

/**
 * Trap edges: income exactly at the three boundaries of the GBP 100k personal allowance taper
 * (E23 section 9.1). 100,000 is the last pound outside the trap, 112,570 is where the allowance
 * has tapered to half (12,570 / 2 above 100,000 is a 6,285 loss), and 125,140 is where it
 * reaches zero and the last pound inside the trap.
 */
export const trapEdgeVariants = {
  at100k: employee(100000),
  at112570: employee(112570),
  at125140: employee(125140),
  /** One pound above the trap: the additional rate begins. */
  at125141: employee(125141),
} satisfies Record<string, ProfileFacts>;

export const trapEdge: PersonaFixture = {
  profile: trapEdgeVariants.at112570,
  accounts: [],
  details: [],
  budget: [],
  taxRecords: [],
};
