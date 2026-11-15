import { homeowner } from "./picture/__fixtures__/personas/homeowner.js";
import { sam } from "./picture/__fixtures__/personas/sam.js";
import type { PersonaFixture } from "./picture/__fixtures__/types.js";

export type SampleHouseholdKey = "renter" | "homeowner";

export interface SampleHousehold {
  key: SampleHouseholdKey;
  label: string;
  description: string;
  fixture: PersonaFixture;
}

/**
 * Static sample households for marketing previews and illustrative sandbox views.
 *
 * Renter: Sam, 29, renting in England with emergency savings and a Plan 2 student loan.
 * Homeowner: Homeowner with a repayment mortgage, savings and a workplace pension.
 */
export const SAMPLE_HOUSEHOLDS: Record<SampleHouseholdKey, SampleHousehold> = {
  renter: {
    key: "renter",
    label: "Renting",
    description: "Sam, 29, renting in England with emergency savings and a student loan.",
    fixture: sam,
  },
  homeowner: {
    key: "homeowner",
    label: "Paying a mortgage",
    description: "Homeowner with a repayment mortgage, emergency savings and a pension.",
    fixture: homeowner,
  },
};
