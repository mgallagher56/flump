import { describe, expect, it } from "vitest";
import {
  estimateIsaUsed,
  isAdultIsaAccount,
  isaAllowanceFor,
  monthsIntoTaxYear,
  selectIsaAllowanceUsed,
} from "./isa-allowance-used.js";

describe("isAdultIsaAccount", () => {
  it("counts adult ISAs, including Lifetime ISAs", () => {
    expect(isAdultIsaAccount("Stocks and Shares ISA")).toBe(true);
    expect(isAdultIsaAccount("Cash ISA")).toBe(true);
    expect(isAdultIsaAccount("Lifetime ISA")).toBe(true);
    expect(isAdultIsaAccount("My LISA")).toBe(true);
  });

  it("leaves out Junior ISAs and names that only contain the letters", () => {
    expect(isAdultIsaAccount("Junior ISA")).toBe(false);
    expect(isAdultIsaAccount("Kids JISA")).toBe(false);
    expect(isAdultIsaAccount("Easy access saver")).toBe(false);
    expect(isAdultIsaAccount("Crisalis fund")).toBe(false);
  });

  it("lets a chosen subtype decide over the name", () => {
    expect(isAdultIsaAccount({ name: "Rainy day", accountSubtype: "cash_isa" })).toBe(true);
    expect(isAdultIsaAccount({ name: "Cash ISA", accountSubtype: "easy_access" })).toBe(false);
  });
});

describe("monthsIntoTaxYear", () => {
  it("counts the months of the tax year that have started", () => {
    // 6 April starts month 1; 5 April is the last day of month 12.
    expect(monthsIntoTaxYear(new Date(2026, 3, 6))).toBe(1);
    expect(monthsIntoTaxYear(new Date(2026, 3, 5))).toBe(12);
    // 14 November: months starting 6 Apr, May, Jun, Jul, Aug, Sep, Oct; 6 Nov not yet = 7, plus
    // the current one (from 6 October) is already counted, so 14 Nov is in the 8th month.
    expect(monthsIntoTaxYear(new Date(2026, 10, 14))).toBe(8);
    expect(monthsIntoTaxYear(new Date(2027, 0, 10))).toBe(10);
  });
});

describe("estimateIsaUsed and selectIsaAllowanceUsed", () => {
  const today = new Date(2026, 10, 14);

  it("is the monthly amount x months started, capped at the allowance", () => {
    // £300 x 8 months = £2,400.
    expect(estimateIsaUsed([{ name: "Cash ISA", monthlyContribution: 300 }], today)).toBe(2400);
    // £5,000 x 8 = £40,000, capped at the 2026/27 allowance of £20,000.
    expect(estimateIsaUsed([{ name: "Cash ISA", monthlyContribution: 5000 }], today)).toBe(20000);
    // Two ISAs: (£150 + "£100") x 8 = £2,000; a non-ISA saver is left out.
    expect(
      selectIsaAllowanceUsed(
        [
          { name: "Cash ISA", monthlyContribution: 150 },
          { name: "S&S", accountSubtype: "stocks_and_shares_isa", monthlyContribution: "100" },
          { name: "Saver", monthlyContribution: 500 },
        ],
        today,
      ),
    ).toBe(2000);
  });

  it("is null when no adult ISA stores a monthly amount", () => {
    expect(estimateIsaUsed([{ name: "Junior ISA", monthlyContribution: 300 }], today)).toBeNull();
    expect(estimateIsaUsed([{ name: "Saver", monthlyContribution: 300 }], today)).toBeNull();
    expect(estimateIsaUsed([{ name: "Cash ISA", monthlyContribution: null }], today)).toBeNull();
  });

  it("takes the allowance from the engine's tax year rules", () => {
    // gov.uk: the adult ISA allowance is £20,000 a year.
    expect(isaAllowanceFor(today)).toBe(20000);
  });
});
