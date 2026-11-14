import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  DashboardKpiStrip,
  type DashboardKpiStripProps,
  LEFT_OVER_EXPLAIN,
  stripShowsDebt,
} from "./DashboardKpiStrip";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const base: DashboardKpiStripProps = {
  monthlySurplus: 1500,
  totalOwed: null,
  pensionPot: 30000,
};

const renderStrip = (overrides: Partial<DashboardKpiStripProps> = {}) =>
  render(
    <MemoryRouter>
      <DashboardKpiStrip {...base} {...overrides} />
    </MemoryRouter>,
  );

describe("DashboardKpiStrip", () => {
  it("shows two figures, left over and the pension pots, when there is no debt (N1 4)", () => {
    const { container } = renderStrip();
    expect(screen.getByText("Left over each month")).toBeTruthy();
    expect(screen.getByText("£1,500")).toBeTruthy();
    // Months of cover belongs to Budget (P6), so the strip keeps to two cards.
    expect(screen.queryByText(/months of cover/i)).toBeNull();
    expect(container.querySelectorAll('[data-figure="budget.surplus"]')).toHaveLength(1);
    expect(screen.getByText("Pension pots")).toBeTruthy();
    expect(screen.queryByText(/net worth/i)).toBeNull();
    expect(container.textContent).not.toContain("+");
  });

  it("shows what you owe instead of the pension when there is debt", () => {
    renderStrip({ totalOwed: 8000 });
    expect(screen.getByText("What you owe")).toBeTruthy();
    expect(screen.getByText("£8,000")).toBeTruthy();
    expect(screen.queryByText("Pension pots")).toBeNull();
    expect(stripShowsDebt(8000)).toBe(true);
    expect(stripShowsDebt(0)).toBe(false);
  });

  it("calls a negative figure a shortfall in the usual colour, with a minus sign", () => {
    const { container } = renderStrip({ monthlySurplus: -250 });
    expect(screen.getByText("Short each month")).toBeTruthy();
    const figure = container.querySelector('[data-figure="budget.surplus"]');
    expect(figure?.textContent).toMatch(/−£250|-£250/);
    expect(figure?.innerHTML).not.toMatch(/danger|positive/);
  });

  it("replaces the strip with one prompt when there is no budget", () => {
    renderStrip({ monthlySurplus: null });
    expect(screen.getByText("Add your budget to see what is left over each month")).toBeTruthy();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it('keeps to the one known figure, with no "Not set" card, when there is no pension or debt', () => {
    renderStrip({ pensionPot: null });
    expect(screen.getByText("Left over each month")).toBeTruthy();
    expect(screen.queryByText("Pension pots")).toBeNull();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("explains how left over is worked out in plain words", () => {
    expect(LEFT_OVER_EXPLAIN.split(/\s+/).length).toBeLessThanOrEqual(25);
    expect(LEFT_OVER_EXPLAIN).not.toMatch(/only|just|should/i);
  });

  it("shows the budget income and asks for spending when the budget has income only", () => {
    const { container } = renderStrip({ monthlySurplus: null, incomeOnly: 2085 });
    expect(screen.getByText("Income in your budget")).toBeTruthy();
    expect(container.querySelector('[data-figure="budget.income"]')?.textContent).toBe("£2,085");
    const link = screen.getByRole("link", {
      name: "Add your spending to see what is left over each month",
    });
    expect(link.getAttribute("href")).toBe("/app/budget");
    // Never "left over" as income minus nothing, and never the no-budget prompt.
    expect(screen.queryByText(/Left over each month/)).toBeNull();
    expect(container.querySelector('[data-figure="budget.surplus"]')).toBeNull();
    expect(screen.queryByText("Add your budget to see what is left over each month")).toBeNull();
    expect(screen.getByText("Pension pots")).toBeTruthy();
  });
});
