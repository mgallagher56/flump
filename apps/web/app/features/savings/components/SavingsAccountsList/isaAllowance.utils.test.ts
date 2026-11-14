import { describe, expect, it } from "vitest";
import { estimateIsaUsed, isIsaAccount, monthsIntoTaxYear } from "./isaAllowance.utils";

describe("isIsaAccount", () => {
  it("counts adult ISAs, including Lifetime ISAs", () => {
    expect(isIsaAccount("Stocks and Shares ISA")).toBe(true);
    expect(isIsaAccount("Cash ISA")).toBe(true);
    expect(isIsaAccount("Lifetime ISA")).toBe(true);
    expect(isIsaAccount("My LISA")).toBe(true);
  });

  it("leaves out Junior ISAs and names that only contain the letters", () => {
    expect(isIsaAccount("Junior ISA")).toBe(false);
    expect(isIsaAccount("Kids JISA")).toBe(false);
    expect(isIsaAccount("Easy access saver")).toBe(false);
    expect(isIsaAccount("Crisalis fund")).toBe(false);
    expect(isIsaAccount("Lisbon fund")).toBe(false);
  });
});

describe("monthsIntoTaxYear", () => {
  it("counts the months of the tax year that have started", () => {
    expect(monthsIntoTaxYear(new Date(2026, 3, 6))).toBe(1);
    expect(monthsIntoTaxYear(new Date(2026, 3, 5))).toBe(12);
    expect(monthsIntoTaxYear(new Date(2026, 10, 14))).toBe(8);
    expect(monthsIntoTaxYear(new Date(2027, 0, 10))).toBe(10);
  });
});

describe("estimateIsaUsed", () => {
  it("estimates use from the monthly amount into adult ISAs, capped at the allowance", () => {
    const today = new Date(2026, 10, 14);
    expect(estimateIsaUsed([{ name: "Cash ISA", monthlyContribution: 300 }], today)).toBe(2400);
    expect(estimateIsaUsed([{ name: "Cash ISA", monthlyContribution: 5000 }], today)).toBe(20000);
    expect(estimateIsaUsed([{ name: "Junior ISA", monthlyContribution: 300 }], today)).toBeNull();
    expect(estimateIsaUsed([{ name: "Saver", monthlyContribution: 300 }], today)).toBeNull();
    expect(estimateIsaUsed([{ name: "Cash ISA", monthlyContribution: null }], today)).toBeNull();
  });
});
