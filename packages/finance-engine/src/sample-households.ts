import { homeowner } from "./picture/__fixtures__/personas/homeowner.js";
import { sam } from "./picture/__fixtures__/personas/sam.js";
import type { PersonaFixture } from "./picture/__fixtures__/types.js";

export type SampleHouseholdKey = "renter" | "homeowner";

export interface SampleHousehold {
  key: SampleHouseholdKey;
  label: string;
  description: string;
  fixture: PersonaFixture;
  /**
   * The employer's workplace pension contribution, as a percentage of salary, that the sample
   * previews show. Sample data only: the persona profile type has no employer rate, so it sits
   * here; null means not set.
   */
  pensionEmployerPercent: number | null;
}

/**
 * Static sample households for marketing previews and illustrative sandbox views.
 *
 * Renter: Sam, 29, renting in England with emergency savings and a Plan 2 student loan.
 * Homeowner: Homeowner with a repayment mortgage, savings, a workplace pension, a credit card and
 * a personal loan.
 */
export const SAMPLE_HOUSEHOLDS: Record<SampleHouseholdKey, SampleHousehold> = {
  renter: {
    key: "renter",
    label: "Renting",
    description: "Sam, 29, renting in England with emergency savings and a student loan.",
    fixture: sam,
    pensionEmployerPercent: 3,
  },
  homeowner: {
    key: "homeowner",
    label: "Paying a mortgage",
    description:
      "Homeowner with a repayment mortgage, emergency savings, a pension, a card and a loan.",
    fixture: homeowner,
    pensionEmployerPercent: 4,
  },
};
