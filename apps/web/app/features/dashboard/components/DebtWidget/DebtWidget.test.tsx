import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { DebtSummary } from "~/utils/debtSummary";
import { DebtWidget, debtCardShowsEstimate } from "./DebtWidget";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const summary: DebtSummary = {
  totalDebt: 8200,
  debtCount: 3,
  highInterestCount: 3,
  monthlyMinimumTotal: 265,
  monthlyMinimumEstimated: false,
  debtFreeDate: "December 2027",
  debts: [],
};

const renderWidget = (data?: DebtSummary | null) =>
  render(
    <MemoryRouter>
      <DebtWidget data={data} />
    </MemoryRouter>,
  );

describe("DebtWidget", () => {
  it("shows the debt-free date as an estimate, with no badge and no total", () => {
    renderWidget(summary);
    expect(screen.getByText("Debt-free date (estimate)")).toBeTruthy();
    expect(screen.getByText("December 2027")).toBeTruthy();
    expect(screen.queryByText(/high APR/i)).toBeNull();
    expect(screen.queryByText("£8,200")).toBeNull();
    expect(screen.getByText("Assumes you pay the minimum on each debt every month.")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(debtCardShowsEstimate(summary)).toBe(true);
  });

  it("asks for the APR instead of modelling an unknown rate", () => {
    const data = {
      ...summary,
      debts: [{ aprKnown: false } as unknown as DebtSummary["debts"][number]],
    };
    renderWidget(data);
    expect(screen.getByText("Not set")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add your rates/ })).toBeTruthy();
    expect(debtCardShowsEstimate(data)).toBe(false);
  });

  it('reads "Not set" when the minimums never clear the debt', () => {
    renderWidget({ ...summary, debtFreeDate: null });
    expect(screen.getByText("Not set")).toBeTruthy();
  });

  it("offers to add a debt when there is none", () => {
    renderWidget(null);
    expect(screen.getByRole("link", { name: /Add a debt/ })).toBeTruthy();
    expect(debtCardShowsEstimate(null)).toBe(false);
  });
});
