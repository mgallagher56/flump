import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnnualAllowancePill } from "./AnnualAllowancePill";

describe("AnnualAllowancePill", () => {
  it("renders the ISA allowance, days to 5 April and the savings allowance", () => {
    render(<AnnualAllowancePill type="isa" currentAmount={8500} savingsInterest={300} />);

    expect(screen.getByText("ISA allowance")).toBeDefined();
    expect(screen.getByText("£11,500 left to use this tax year")).toBeDefined();
    expect(screen.getByText(/Limit £20,000 a tax year/)).toBeDefined();
    expect(screen.getByText(/days until 5 April/)).toBeDefined();
    expect(screen.getByText(/Personal Savings Allowance/)).toBeDefined();
    expect(screen.getByRole("progressbar", { name: "ISA allowance used" })).toBeDefined();
  });

  it("renders the pension allowance with the £60,000 limit", () => {
    render(<AnnualAllowancePill type="pension" currentAmount={25000} />);

    expect(screen.getByText("Pension allowance")).toBeDefined();
    expect(screen.getByText(/Limit £60,000 a tax year/)).toBeDefined();
    expect(screen.getByText("£35,000 left to use this tax year")).toBeDefined();
    expect(screen.queryByText(/Personal Savings Allowance/)).toBeNull();
  });

  it("lists the accounts that count towards the ISA allowance", () => {
    render(
      <AnnualAllowancePill
        contributingAccounts={[{ name: "Vanguard ISA", balance: 15000 }]}
        currentAmount={15000}
        type="isa"
      />,
    );
    expect(screen.getByText(/Vanguard ISA \(£15,000\)/)).toBeDefined();
  });
});
