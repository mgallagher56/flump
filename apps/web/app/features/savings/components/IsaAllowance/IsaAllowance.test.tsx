import { countFigures } from "@repo/ui/testing";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IsaAllowance } from "./IsaAllowance";
import { estimateIsaUsed, isIsaAccount, monthsIntoTaxYear } from "./isaAllowance.utils";

describe("IsaAllowance", () => {
  it("shows one bar and 2 figures: unused and the limit", () => {
    const { container } = render(<IsaAllowance used={2400} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(
      "Estimate: £2,400 used, £17,600 unused",
    );
    expect(container.textContent).toContain("£17,600 unused");
    expect(container.textContent).toContain("£20,000 a tax year");
    expect(countFigures(container)).toBe(2);
    expect(screen.getByRole("progressbar", { name: "Estimated use this tax year" })).toBeDefined();
  });
});

describe("isaAllowance helpers", () => {
  it("recognises ISA accounts by name", () => {
    expect(isIsaAccount("Stocks and Shares ISA")).toBe(true);
    expect(isIsaAccount("Lifetime ISA")).toBe(true);
    expect(isIsaAccount("Easy access saver")).toBe(false);
    expect(isIsaAccount("Crisalis fund")).toBe(false);
  });

  it("counts the months of the tax year that have started", () => {
    expect(monthsIntoTaxYear(new Date(2026, 3, 6))).toBe(1);
    expect(monthsIntoTaxYear(new Date(2026, 3, 5))).toBe(12);
    expect(monthsIntoTaxYear(new Date(2026, 10, 14))).toBe(8);
    expect(monthsIntoTaxYear(new Date(2027, 0, 10))).toBe(10);
  });

  it("estimates use from the monthly amount into ISAs, capped at the allowance", () => {
    const today = new Date(2026, 10, 14);
    expect(estimateIsaUsed([{ name: "Cash ISA", monthlyContribution: 300 }], today)).toBe(2400);
    expect(estimateIsaUsed([{ name: "Cash ISA", monthlyContribution: 5000 }], today)).toBe(20000);
    expect(estimateIsaUsed([{ name: "Saver", monthlyContribution: 300 }], today)).toBeNull();
    expect(estimateIsaUsed([{ name: "Cash ISA", monthlyContribution: null }], today)).toBeNull();
  });
});
