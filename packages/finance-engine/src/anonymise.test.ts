import { describe, expect, it } from "vitest";
import {
  anonymiseDescription,
  anonymousBudgetEntryLabels,
  INSTITUTION_SCRUB_LIST,
  redactAccountNumbers,
  scrubInstitutionNames,
} from "./anonymise.js";

describe("scrubInstitutionNames (E17-N4)", () => {
  it("replaces every listed institution, case-insensitively", () => {
    for (const name of INSTITUTION_SCRUB_LIST) {
      expect(scrubInstitutionNames(`Paid ${name.toUpperCase()} card`)).toBe("Paid Bank card");
      expect(scrubInstitutionNames(`Paid ${name} card`)).toBe("Paid Bank card");
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

  it("catches spacing, hyphen, zero-width, full-width and homoglyph bypasses", () => {
    expect(scrubInstitutionNames("NAT WEST")).toBe("Bank");
    expect(scrubInstitutionNames("Mon-zo coffee")).toBe("Bank coffee");
    expect(scrubInstitutionNames("Mon\u200Bzo coffee")).toBe("Bank coffee");
    expect(scrubInstitutionNames("\uFF2D\uFF4F\uFF4E\uFF5A\uFF4F coffee")).toBe("Bank coffee");
    // Cyrillic o and Latin rest
    expect(scrubInstitutionNames("M\u043Enzo coffee")).toBe("Bank coffee");
    expect(scrubInstitutionNames("Sainsbury's Bank")).toBe("Bank");
    expect(scrubInstitutionNames("Royal Bank of Scotland")).toBe("Bank");
    expect(scrubInstitutionNames("Co-op")).toBe("Bank");
  });

  it("uses word boundaries so ordinary words survive", () => {
    expect(scrubInstitutionNames("Atomic Kitten tickets")).toBe("Atomic Kitten tickets");
    expect(scrubInstitutionNames("Tidewater")).toBe("Tidewater");
  });

  it("is linear on adversarial input", () => {
    const hostile = `${"m- ".repeat(20000)}x`;
    const start = performance.now();
    scrubInstitutionNames(hostile);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("redacts sort codes and long digit runs", () => {
    expect(redactAccountNumbers("Sort 12-34-56 acc 12345678")).toBe(
      "Sort [redacted] acc [redacted]",
    );
    expect(redactAccountNumbers("Ref 12345")).toBe("Ref 12345");
    expect(anonymiseDescription("Monzo 12-34-56 12345678")).toBe("Bank [redacted] [redacted]");
  });
});

describe("anonymousBudgetEntryLabels (M-PRIV4)", () => {
  it("labels entries by category plus ordinal and never uses the entry name", () => {
    const labels = anonymousBudgetEntryLabels([
      { category: "Housing", isIncome: false },
      { category: "Salary", isIncome: true },
      { category: "Housing", isIncome: false },
      { category: "Food", isIncome: false },
      { category: "Bonus", isIncome: true },
    ]);
    expect(labels).toEqual(["Housing #1", "Income #1", "Housing #2", "Food #1", "Income #2"]);
  });

  it("scrubs institution names and account numbers from the category", () => {
    expect(
      anonymousBudgetEntryLabels([
        { category: "Monzo 12345678", isIncome: false },
        { category: "  ", isIncome: false },
      ]),
    ).toEqual(["Bank [redacted] #1", "Budget entry #1"]);
  });
});
