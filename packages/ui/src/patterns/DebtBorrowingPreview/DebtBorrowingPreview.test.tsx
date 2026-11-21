import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebtBorrowingPreview, debtFreeDateText } from "./DebtBorrowingPreview";

const AS_OF = new Date("2026-11-01T12:00:00Z");

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
//   debt-free date, measured from AS_OF (1 November 2026), at 60 + 220 = 280 a month with a
//   cleared debt's payment moved to the next (monthly rates 6.9% / 12 = 0.575% and
//   22.9% / 12 = 1.9083%):
//   - the loan clears in -ln(1 - 0.00575 x 7,200 / 220) / ln(1.00575) = 36.4, so 37 months;
//   - the card after 37 months at 60 owes 1,800 x 1.019083^37 - 60 x (1.019083^37 - 1) / 0.019083
//     = about 439, less the part of the 220 the loan no longer needs in month 37 (about 140), so
//     about 299; at the full 280 a month, 299 x 1.0191 - 280 = 24 is left after month 38, cleared
//     in month 39;
//   - month 39 after November 2026 is February 2030.

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
    expect(date.getByText("February 2030")).toBeDefined();

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

  it("puts every figure in tabular numbers", () => {
    render(<DebtBorrowingPreview household="homeowner" id="db-nums" />);
    for (const figure of screen.getAllByText(/£/)) {
      expect(figure.className).toMatch(/tabular-nums|fv-num_tabular-nums/);
    }
  });

  it("says 'Not set' only when a rate is missing, and says in words when minimums never clear the debts", () => {
    expect(debtFreeDateText({ debtFreeDate: "March 2029", debts: [{ apr: 20 }] })).toBe(
      "March 2029",
    );
    expect(debtFreeDateText({ debtFreeDate: null, debts: [{ apr: 20 }, { apr: undefined }] })).toBe(
      "Not set",
    );
    expect(debtFreeDateText({ debtFreeDate: null, debts: [{ apr: 20 }] })).toBe(
      "Not paid off at minimum payments",
    );
    expect(debtFreeDateText(null)).toBe("Not set");
  });
});

describe("DebtBorrowingPreview sections", () => {
  it("lists only student loans under Student loan, and has no such section without one", () => {
    const { unmount } = render(<DebtBorrowingPreview asOf={AS_OF} household="renter" id="db" />);
    // The renter's current account and cash ISA are not debts.
    const list = screen.getByRole("list", { name: "Student loans" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    unmount();
    render(<DebtBorrowingPreview asOf={AS_OF} household="homeowner" id="db-owner" />);
    expect(screen.queryByTestId("db-owner-student-loan")).toBeNull();
  });
});
