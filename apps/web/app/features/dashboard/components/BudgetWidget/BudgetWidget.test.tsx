import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { BudgetWidget, formatMonthsOfCover } from "./BudgetWidget";

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
    expect(screen.getByText("Going out each month")).toBeTruthy();
    expect(screen.getByText("£2,150")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it('reads "Not set" with one link when there is no budget', () => {
    renderWidget({ budgetKnown: false, monthlyExpenses: 0 });
    expect(screen.getByText("Not set")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add your budget/ })).toBeTruthy();
  });
});

describe("formatMonthsOfCover", () => {
  it("formats months and long runways in plain words", () => {
    expect(formatMonthsOfCover(1)).toBe("1 month");
    expect(formatMonthsOfCover(4.74)).toBe("4.7 months");
    expect(formatMonthsOfCover(130)).toBe("10+ years");
    expect(formatMonthsOfCover(-2)).toBe("0 months");
  });
});
