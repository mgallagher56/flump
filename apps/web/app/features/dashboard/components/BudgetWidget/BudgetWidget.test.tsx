import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { BudgetWidget } from "./BudgetWidget";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderWidget = (data: Parameters<typeof BudgetWidget>[0]["data"]) =>
  render(
    <MemoryRouter>
      <BudgetWidget data={data} />
    </MemoryRouter>,
  );

describe("BudgetWidget", () => {
  it("shows spending each month as its one figure", () => {
    renderWidget({ budgetKnown: true, monthlyIncome: 3000, monthlyExpenses: 2150 });
    expect(screen.getByText("Spending each month")).toBeTruthy();
    expect(screen.getByText("£2,150")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows breathing room as its line when the picture knows it", () => {
    const { container } = renderWidget({
      budgetKnown: true,
      monthlyExpenses: 2150,
      monthsOfCover: 1.5,
    });
    expect(screen.getByText(/Breathing room:/).textContent).toBe(
      "Breathing room: about 1.5 months",
    );
    const figure = container.querySelector('[data-figure="monthsOfCover"]');
    expect(figure?.textContent).toBe("about 1.5 months");
    expect(figure?.className).toContain("tabular-nums");
  });

  it("keeps the plain line when breathing room is not known", () => {
    renderWidget({ budgetKnown: true, monthlyExpenses: 2150, monthsOfCover: null });
    expect(screen.getByText("Bills and living costs in your budget.")).toBeTruthy();
    expect(screen.queryByText(/Breathing room/)).toBeNull();
  });

  it('reads "Not set" with one link when there is no budget', () => {
    renderWidget({ budgetKnown: false, monthlyExpenses: 0 });
    expect(screen.getByText("Not set")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add your budget/ })).toBeTruthy();
  });
});

describe("<BudgetWidget /> with a refused take-home line", () => {
  it("says why the budget is unknown instead of asking for a budget", () => {
    const notice =
      "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.";
    renderWidget({ monthlyExpenses: 0, budgetKnown: false, budgetNotice: notice });
    expect(screen.getByText(notice)).toBeDefined();
    expect(screen.queryByText("Add your budget to see what you spend each month.")).toBeNull();
    expect(screen.getByRole("link", { name: "Open budget" })).toBeDefined();
  });
});
