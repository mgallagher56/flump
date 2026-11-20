import {
  calculateDebtSchedule,
  normalizeDebtItem,
  PortfolioSnapshot,
  SAMPLE_HOUSEHOLDS,
} from "@flump/finance-engine";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebtBorrowingPreview } from "./DebtBorrowingPreview";

const AS_OF = new Date("2026-11-20T12:00:00Z");

// Worked by hand from the sample households (persona fixtures under
// packages/finance-engine/src/picture/__fixtures__/personas).
//
// renter (sam.ts): a 41,500 Plan 2 student loan, no card, no loan, no mortgage. The student loan
//   is not in the debt-free date, so there is no cards and loans section and no date; with no
//   mortgage there is no mortgage section at all.
//
// homeowner (homeowner.ts):
//   credit card 1,800 at 22.9% APR, 60 a month; personal loan 7,200 at 6.9% APR, 220 a month.
//   mortgage 186,000 at 4.19%, fixed rate ending 30 September 2028, which is after AS_OF.
//   debt-free date on minimum payments: taken from the engine's schedule directly (below). As a
//   hand check on its range: alone, the loan clears in about -ln(1 - 0.00575 x 7,200 / 220) /
//   ln(1.00575) = 36.4 months and the card in about -ln(1 - 0.019083 x 1,800 / 60) /
//   ln(1.019083) = 45.0 months, so the date is 37 to 46 months after November 2026.
const homeownerDebtFreeDate = (): string => {
  const { fixture } = SAMPLE_HOUSEHOLDS.homeowner;
  const debts = new PortfolioSnapshot(fixture.accounts, fixture.details).toDebtItems();
  const schedule = calculateDebtSchedule(
    debts.map((d) => normalizeDebtItem(d)),
    0,
    "AVALANCHE",
    { referenceDate: AS_OF },
  );
  expect(schedule.payoffAchievable).toBe(true);
  expect(schedule.monthsToPayoff).toBeGreaterThanOrEqual(37);
  expect(schedule.monthsToPayoff).toBeLessThanOrEqual(46);
  return schedule.debtFreeDate ?? "";
};

describe("DebtBorrowingPreview", () => {
  it("shows the renter's student loan and no mortgage section", () => {
    const { container } = render(<DebtBorrowingPreview asOf={AS_OF} household="renter" id="db" />);

    const loan = within(screen.getByTestId("db-student-loan-sam-student-loan"));
    expect(loan.getByText("Student loan")).toBeDefined();
    expect(loan.getByText("£41,500")).toBeDefined();
    expect(loan.getByText("Repayments come out of your pay")).toBeDefined();

    expect(screen.queryByTestId("db-cards-and-loans")).toBeNull();
    expect(screen.queryByTestId("db-debt-free-date")).toBeNull();
    expect(screen.queryByTestId("db-mortgage")).toBeNull();
    expect(container.textContent).not.toMatch(/mortgage|Not set/i);
  });

  it("shows the homeowner's card, loan, debt-free date and mortgage", () => {
    render(<DebtBorrowingPreview asOf={AS_OF} household="homeowner" id="db-owner" />);

    const card = within(screen.getByTestId("db-owner-cards-and-loans-homeowner-card"));
    expect(card.getByText("Credit card")).toBeDefined();
    expect(card.getByText("22.9% APR")).toBeDefined();
    expect(card.getByText("£1,800")).toBeDefined();

    const loan = within(screen.getByTestId("db-owner-cards-and-loans-homeowner-loan"));
    expect(loan.getByText("Personal loan")).toBeDefined();
    expect(loan.getByText("6.9% APR")).toBeDefined();
    expect(loan.getByText("£7,200")).toBeDefined();

    const date = within(screen.getByTestId("db-owner-debt-free-date"));
    expect(date.getByText("Estimated debt-free date")).toBeDefined();
    expect(date.getByText(homeownerDebtFreeDate())).toBeDefined();

    const mortgage = within(screen.getByTestId("db-owner-mortgage-homeowner-mortgage"));
    expect(mortgage.getByText("Residential mortgage")).toBeDefined();
    expect(mortgage.getByText("4.19% interest, fixed until September 2028")).toBeDefined();
    expect(mortgage.getByText("£186,000")).toBeDefined();
  });

  it("leaves out the fixed rate once it has ended", () => {
    render(
      <DebtBorrowingPreview
        asOf={new Date("2028-10-01T12:00:00Z")}
        household="homeowner"
        id="db-later"
      />,
    );
    const mortgage = within(screen.getByTestId("db-later-mortgage-homeowner-mortgage"));
    expect(mortgage.getByText("4.19% interest")).toBeDefined();
  });

  it("carries no judgement of a rate", () => {
    const { container } = render(
      <DebtBorrowingPreview asOf={AS_OF} household="homeowner" id="db-copy" />,
    );
    expect(container.textContent).not.toMatch(/high|expensive|warning|danger|only|just/i);
  });
});
