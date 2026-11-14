import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  DashboardKpiStrip,
  type DashboardKpiStripProps,
  stripShowsDebt,
} from "./DashboardKpiStrip";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const base: DashboardKpiStripProps = {
  budgetKnown: true,
  monthlySurplus: 1500,
  monthsOfCover: 4.7,
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
  it("shows left over, months of cover and the pension pots when there is no debt", () => {
    const { container } = renderStrip();
    expect(screen.getByText("Left over each month")).toBeTruthy();
    expect(screen.getByText("£1,500")).toBeTruthy();
    expect(screen.getByText("4.7 months")).toBeTruthy();
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
    expect(screen.getByText("Monthly shortfall")).toBeTruthy();
    const figure = container.querySelector('[data-figure="budget.surplus"]');
    expect(figure?.textContent).toMatch(/−£250|-£250/);
    expect(figure?.innerHTML).not.toMatch(/danger|positive/);
  });

  it("replaces the strip with one prompt when most figures are unknown", () => {
    renderStrip({ budgetKnown: false, monthlySurplus: null, monthsOfCover: null });
    expect(
      screen.getByText(
        "Add your budget to see what is left over each month and your months of cover",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it('shows one "Not set" with one link when a single figure is unknown', () => {
    renderStrip({ pensionPot: null });
    expect(screen.getAllByText("Not set")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Add a pension" })).toBeTruthy();
  });
});
