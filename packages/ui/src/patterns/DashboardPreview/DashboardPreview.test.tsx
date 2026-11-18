import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardPreview } from "./DashboardPreview";

// Worked by hand from the persona fixtures (packages/finance-engine/src/picture/__fixtures__/personas).
// Both use DEFAULT_NET_WORTH_BASIS: property and mortgages count, student loans do not.
//
// renter (sam.ts):
//   net worth: 1,850 current + 4,200 cash ISA = 6,050 (the 41,500 student loan is left out).
//   what you owe outside a mortgage: no consumer debt + 41,500 student loan = 41,500.
//   no pension account, so no pension card; no mortgage, so no mortgage card.
//   budget: income 2,382; essentials 850 rent + 120 bills + 220 groceries + 90 travel = 1,280;
//     savings 150 (ISA saving); discretionary 200 (going out).
//     spending each month = essentials + discretionary = 1,280 + 200 = 1,480.
//     left over = 2,382 - 1,280 - 200 - 150 = 752.
//   breathing room: liquid cash 6,050 / essentials 1,280 = 4.73, so about 4.7 months.
//   accounts tracked: 3.
//
// homeowner (homeowner.ts):
//   net worth: 21,000 cash + 96,000 pension + 310,000 home - 186,000 mortgage = 241,000.
//   the home is the "Home (your estimate)" account, so the hero says it includes the estimate.
//   no consumer debt or student loan, so no "What you owe" card. Pension pots: 96,000.
//   budget: income 3,249; essentials 1,050 mortgage + 330 council tax and energy + 400 groceries
//     = 1,780; savings 300; discretionary 250.
//     spending each month = 1,780 + 250 = 2,030. left over = 3,249 - 1,780 - 250 - 300 = 919.
//   breathing room: liquid cash 21,000 / 1,780 = 11.80, so about 11.8 months.
//   mortgage card: 186,000 balance; loan to value 186,000 / 310,000 = 60%.
//   accounts tracked: 4.
const EXPECTED = {
  renter: {
    netWorth: "£6,050",
    leftOver: "£752",
    owed: "£41,500",
    spending: "£1,480",
    breathingRoom: "Breathing room: about 4.7 months",
    accounts: "3",
  },
  homeowner: {
    netWorth: "£241,000",
    leftOver: "£919",
    pensions: "£96,000",
    spending: "£2,030",
    breathingRoom: "Breathing room: about 11.8 months",
    accounts: "4",
    mortgage: "£186,000",
    ltv: "60% loan to value",
  },
} as const;

describe("DashboardPreview", () => {
  it("renders the renter's figures, each once", () => {
    const expected = EXPECTED.renter;
    const { container } = render(<DashboardPreview household="renter" id="dash" />);

    expect(screen.getByText("Net worth")).toBeDefined();
    expect(screen.getAllByText(expected.netWorth)).toHaveLength(1);
    expect(
      within(screen.getByTestId("dash-section-accounts")).getByText(expected.accounts),
    ).toBeDefined();

    const kpis = within(screen.getByTestId("dash-kpis"));
    expect(kpis.getByText("Left over each month")).toBeDefined();
    expect(kpis.getByText(expected.leftOver)).toBeDefined();
    expect(kpis.getByText("What you owe")).toBeDefined();
    expect(kpis.getByText(expected.owed)).toBeDefined();
    expect(kpis.queryByText("Pension pots")).toBeNull();

    const budgetCard = within(screen.getByTestId("dash-section-budget"));
    expect(budgetCard.getByText("Spending each month")).toBeDefined();
    expect(budgetCard.getByText(expected.spending)).toBeDefined();
    expect(budgetCard.getByText(expected.breathingRoom)).toBeDefined();

    // "Left over each month" appears once: the Budget card no longer repeats it.
    expect(screen.getAllByText("Left over each month")).toHaveLength(1);
    expect(screen.getAllByText(expected.leftOver)).toHaveLength(1);
    expect(screen.queryByTestId("dash-section-mortgage")).toBeNull();
    expect(container.querySelector('[data-kpi-strip="empty"]')).toBeNull();
  });

  it("renders the homeowner's figures, with the mortgage as its own card", () => {
    const expected = EXPECTED.homeowner;
    render(<DashboardPreview household="homeowner" id="dash-owner" />);

    expect(screen.getByText("Net worth, including your home estimate")).toBeDefined();
    expect(screen.getAllByText(expected.netWorth)).toHaveLength(1);

    const kpis = within(screen.getByTestId("dash-owner-kpis"));
    expect(kpis.getByText(expected.leftOver)).toBeDefined();
    expect(kpis.getByText("Pension pots")).toBeDefined();
    expect(kpis.getByText(expected.pensions)).toBeDefined();
    expect(kpis.queryByText("What you owe")).toBeNull();

    const mortgage = within(screen.getByTestId("dash-owner-section-mortgage"));
    expect(mortgage.getByText(expected.mortgage)).toBeDefined();
    expect(mortgage.getByText(expected.ltv)).toBeDefined();

    const budgetCard = within(screen.getByTestId("dash-owner-section-budget"));
    expect(budgetCard.getByText(expected.spending)).toBeDefined();
    expect(budgetCard.getByText(expected.breathingRoom)).toBeDefined();
    expect(
      within(screen.getByTestId("dash-owner-section-accounts")).getByText(expected.accounts),
    ).toBeDefined();
    expect(screen.getAllByText(expected.pensions)).toHaveLength(1);
  });
});
