import { describe, expect, it } from "vitest";
import { INSTITUTION_SCRUB_LIST, scrubInstitutionNames } from "./anonymise.js";

describe("scrubInstitutionNames (E17-N4)", () => {
  it("replaces every listed institution, case-insensitively", () => {
    for (const name of INSTITUTION_SCRUB_LIST) {
      expect(scrubInstitutionNames(`Paid ${name.toUpperCase()} card`)).toBe("Paid Bank card");
    }
  });

  it("covers the union of the previous tool and engine lists", () => {
    for (const n of [
      "monzo",
      "starling",
      "barclays",
      "hsbc",
      "santander",
      "natwest",
      "lloyds",
      "halifax",
      "amex",
    ]) {
      expect(INSTITUTION_SCRUB_LIST).toContain(n);
    }
  });

  it("leaves unrelated text alone", () => {
    expect(scrubInstitutionNames("Tesco groceries")).toBe("Tesco groceries");
  });
});
