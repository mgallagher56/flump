import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { BudgetWidget, type BudgetWidgetData, formatRunway } from "./BudgetWidget";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const baseData: BudgetWidgetData = {
  monthlyIncome: 6680,
  annualSalary: 100000,
  monthlyExpenses: 4950,
  monthlySurplus: 1730,
  budgetedSavings: 1200,
  livingExpenses: 3750,
  savingsRatePct: 44,
  runwayMonths: 12,
};

const renderWidget = (data: BudgetWidgetData | null) =>
  render(
    <MemoryRouter>
      <BudgetWidget data={data} />
    </MemoryRouter>,
  );

describe("BudgetWidget", () => {
  it("shows Not set with an action, not £0 or 0 mos, when no budget is entered", () => {
    renderWidget({
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlySurplus: 0,
      budgetedSavings: 0,
      livingExpenses: 0,
      savingsRatePct: 0,
      runwayMonths: 0,
      runwayLabel: "0 mo",
    });
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.queryByText("0 mos")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.queryByText(/0%/)).toBeNull();
    expect(screen.getByRole("link", { name: "Add your budget" }).getAttribute("href")).toBe(
      "/app/budget",
    );
  });

  it("shows Not set when there is no data", () => {
    renderWidget(null);
    expect(screen.getByText("Not set")).toBeDefined();
  });

  it("shows surplus, take-home and savings rate in en-GB; no headline is a heading", () => {
    renderWidget(baseData);
    expect(screen.getByText("Monthly surplus")).toBeDefined();
    expect(screen.getByText("+£1,730")).toBeDefined();
    // Take-home in the tile and the "in" figure under the spending bar.
    expect(screen.getAllByText("£6,680")).toHaveLength(2);
    expect(screen.getByText("44%")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("+£1,730");
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Budget"]);
  });

  it("labels a negative surplus as a deficit with a minus sign", () => {
    renderWidget({ ...baseData, monthlySurplus: -300, monthlyExpenses: 6980 });
    expect(screen.getByText("Monthly deficit")).toBeDefined();
    expect(screen.getByText("minus £300")).toBeDefined();
  });

  it("shows savings rate as Not set when income is 0 even if expenses exist", () => {
    renderWidget({
      ...baseData,
      monthlyIncome: 0,
      monthlySurplus: -4950,
      savingsRatePct: 0,
    });
    expect(screen.queryByText("0%")).toBeNull();
    expect(screen.queryByText("Monthly deficit")).toBeNull();
    expect(screen.queryByText(/4,950/)).toBeNull();
    expect(screen.getAllByText("Not set").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole("link", { name: "Add income" }).length).toBe(3);
  });

  it("shows years and months instead of descriptive labels like 'Ironclad Runway'", () => {
    renderWidget({ ...baseData, runwayMonths: 12, runwayLabel: "Ironclad Runway" });
    expect(screen.queryByText("Ironclad Runway")).toBeNull();
    expect(screen.getByText("1 yr")).toBeDefined();
    expect(screen.getByText("Emergency runway")).toBeDefined();
  });

  it("rejects purely descriptive runway labels when runwayMonths is not provided", () => {
    renderWidget({ ...baseData, runwayMonths: null, runwayLabel: "Ironclad Runway" });
    expect(screen.queryByText("Ironclad Runway")).toBeNull();
    expect(screen.getByRole("link", { name: "Add runway details" })).toBeDefined();
  });

  it("exposes spending against income as a labelled progress bar", () => {
    renderWidget(baseData);
    const bar = screen.getByRole("progressbar", { name: "Spending as a share of income" });
    expect(bar.getAttribute("aria-valuenow")).toBe("4950");
    expect(bar.getAttribute("aria-valuemax")).toBe("6680");
    expect(screen.getByText("74% of income")).toBeDefined();
  });

  it("omits the gross salary line when the salary is unknown", () => {
    renderWidget({ ...baseData, annualSalary: null, budgetedSavings: 0 });
    expect(screen.queryByText(/Gross salary/)).toBeNull();
  });
});

describe("formatRunway", () => {
  it.each([
    [0, "0 mos"],
    [0.7, "0.7 mos"],
    [7.5, "7.5 mos"],
    [12, "1 yr"],
    [18, "1 yr 6 mos"],
    [24, "2 yrs"],
    [130, "10+ yrs"],
  ])("formats %s months as %s", (months, expected) => {
    expect(formatRunway(months)).toBe(expected);
  });
});
