import { describe, expect, it } from "vitest";
import { homeowner } from "./picture/__fixtures__/personas/homeowner.js";
import { sam } from "./picture/__fixtures__/personas/sam.js";
import { SAMPLE_HOUSEHOLDS } from "./sample-households.js";

describe("SAMPLE_HOUSEHOLDS", () => {
  it("files each household under its own key", () => {
    for (const [key, household] of Object.entries(SAMPLE_HOUSEHOLDS)) {
      expect(household.key).toBe(key);
    }
    expect(Object.keys(SAMPLE_HOUSEHOLDS).sort()).toEqual(["homeowner", "renter"]);
  });

  it("uses the renter and homeowner persona fixtures", () => {
    expect(SAMPLE_HOUSEHOLDS.renter.fixture).toBe(sam);
    expect(SAMPLE_HOUSEHOLDS.homeowner.fixture).toBe(homeowner);
  });

  it("gives every household a label and a description to show", () => {
    for (const household of Object.values(SAMPLE_HOUSEHOLDS)) {
      expect(household.label.trim()).not.toBe("");
      expect(household.description.trim()).not.toBe("");
    }
  });
});
