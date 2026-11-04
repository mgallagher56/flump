import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AnnualAllowancePill from "./AnnualAllowancePill";

describe("AnnualAllowancePill", () => {
  it("renders ISA annual allowance and days remaining until 5 April", () => {
    render(<AnnualAllowancePill type="isa" currentAmount={8500} savingsInterest={300} />);

    expect(screen.getByText("UK ISA Annual Allowance")).toBeDefined();
    expect(screen.getByText("£20,000 / Tax Year")).toBeDefined();
    expect(screen.getByText(/remaining tax-free capacity/i)).toBeDefined();
    expect(screen.getByText(/days left until 5 april/i)).toBeDefined();
    expect(screen.getByText(/personal savings allowance/i)).toBeDefined();
  });

  it("renders Pension annual allowance (£60,000 limit)", () => {
    render(<AnnualAllowancePill type="pension" currentAmount={25000} />);

    expect(screen.getByText("UK Pension Annual Allowance")).toBeDefined();
    expect(screen.getByText("£60,000 / Tax Year")).toBeDefined();
    expect(screen.getByText("£35,000 remaining tax-free capacity")).toBeDefined();
  });
});
