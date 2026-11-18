import { compareExpensesWithAllowance } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AllowanceComparison } from "./AllowanceComparison";

const selfEmployed = (grossIncome: number, recordedExpenses: number) =>
  compareExpensesWithAllowance({
    source: "self-employed",
    taxYear: "2026/27",
    grossIncome,
    recordedExpenses,
  });

describe("<AllowanceComparison />", () => {
  it("shows the recorded expenses and the trading allowance side by side", () => {
    render(
      <AllowanceComparison allowanceUsedInEstimate={1000} comparison={selfEmployed(12000, 250)} />,
    );
    expect(
      screen.getByRole("heading", { name: "Expenses and the trading allowance" }),
    ).toBeDefined();
    expect(screen.getByTestId("allowance-self-employed").id).toBe("allowance-self-employed");
    const terms = screen.getAllByRole("term").map((t) => t.textContent);
    expect(terms).toEqual(["Expenses you have recorded", "Trading allowance"]);
    expect(screen.getByText("£250")).toBeDefined();
    expect(screen.getByText("£1,000")).toBeDefined();
    expect(
      screen.getByText(
        "The trading allowance is larger than the expenses you have recorded. Your Self Assessment estimate compares the two deductions and uses the trading allowance, which is larger.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText("The allowance replaces your expenses. It is not added to them."),
    ).toBeDefined();
  });

  it("says when the recorded expenses are larger and the estimate uses them", () => {
    const { container } = render(
      <AllowanceComparison allowanceUsedInEstimate={0} comparison={selfEmployed(20000, 3500)} />,
    );
    expect(container.textContent).toContain(
      "The expenses you have recorded are larger than the trading allowance. Your Self Assessment estimate compares the two deductions and uses the expenses you have recorded, which is larger.",
    );
  });

  it("limits the allowance to the income and says the income is covered in full", () => {
    const { container } = render(
      <AllowanceComparison allowanceUsedInEstimate={600} comparison={selfEmployed(600, 0)} />,
    );
    expect(container.textContent).toContain("Up to your income, from an allowance of");
    expect(container.textContent).toContain(
      "Income of £1,000 or less is covered in full by the allowance. You usually do not need to report it. HMRC still asks you to keep records.",
    );
  });

  it("for rental, names the property allowance, the share and the finance cost rule", () => {
    const comparison = compareExpensesWithAllowance({
      source: "rental",
      taxYear: "2026/27",
      grossIncome: 12000,
      recordedExpenses: 600,
      financeCosts: 4000,
      ownershipSharePct: 50,
    });
    const { container } = render(
      <AllowanceComparison
        allowanceUsedInEstimate={0}
        comparison={comparison}
        ownershipSharePct={50}
      />,
    );
    expect(container.textContent).toContain("These figures are your 50% share of the property.");
    expect(container.textContent).toContain(
      "Your Self Assessment estimate compares the total tax each way and uses the expenses you have recorded, which gives the lower total.",
    );
    expect(container.textContent).toContain("Mortgage interest is not in these expenses.");
    fireEvent.click(screen.getByRole("button", { name: /Who cannot use the property allowance/ }));
    expect(screen.getByText(/Rent a Room Scheme/)).toBeDefined();
    expect(screen.getByText(/tax reduction for finance costs/)).toBeDefined();
  });

  it("lists who cannot use the trading allowance and links to GOV.UK in a new tab", () => {
    render(
      <AllowanceComparison allowanceUsedInEstimate={1000} comparison={selfEmployed(5000, 100)} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Who cannot use the trading allowance/ }));
    expect(screen.getByText("Income from a partnership you are a partner in.")).toBeDefined();
    const link = screen.getByRole("link", { name: /on GOV.UK/ });
    expect(link.getAttribute("href")).toBe(
      "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("gives no advice and no judgement colour", () => {
    const { container } = render(
      <AllowanceComparison allowanceUsedInEstimate={1000} comparison={selfEmployed(5000, 100)} />,
    );
    expect(container.textContent).not.toMatch(/you should|better|\bsave\b/i);
    expect(container.innerHTML).not.toMatch(/positive|danger/);
  });
});
