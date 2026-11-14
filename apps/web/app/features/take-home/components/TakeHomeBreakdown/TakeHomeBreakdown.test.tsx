import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TakeHomeBreakdown } from "./TakeHomeBreakdown";

const base = {
  salary: 45000,
  incomeTax: 6486,
  nationalInsurance: 2594,
  pension: 2250,
  studentLoan: 0,
};

describe("<TakeHomeBreakdown />", () => {
  it("lists what comes off pay, a month, in whole pounds, and keys take-home without a figure", () => {
    const { container } = render(<TakeHomeBreakdown {...base} />);
    const table = screen.getByRole("table", { name: "What comes off your pay each month" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getByRole("rowheader").textContent)).toEqual([
      "Income Tax",
      "National Insurance",
      "Pension",
    ]);
    expect(table.textContent).toContain("£541");
    // Take-home is keyed by name only: its figure is the page's estimate card.
    expect(screen.getByText(/Your take-home/)).toBeDefined();
    expect(container.textContent).not.toContain("£2,806");
    expect(table.textContent).not.toMatch(/£[\d,]+\.\d{2}/);
  });

  it("adds a student loan row only when there is a repayment", () => {
    render(<TakeHomeBreakdown {...base} studentLoan={1400} />);
    expect(screen.getByRole("rowheader", { name: "Student loan" })).toBeDefined();
  });

  it("draws one decorative bar segment per row and no donut or legend", () => {
    const { container } = render(<TakeHomeBreakdown {...base} />);
    const bar = screen.getByTestId("pay-bar");
    expect(bar.getAttribute("aria-hidden")).toBe("true");
    expect(bar.querySelectorAll("rect")).toHaveLength(4);
    expect(container.querySelector("svg.recharts-surface")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Where your pay goes" })).toBeDefined();
  });

  it("renders the details slot under the table", () => {
    render(<TakeHomeBreakdown {...base} details={<p>details here</p>} />);
    expect(screen.getByText("details here")).toBeDefined();
  });
});
