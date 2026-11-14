import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { monthlyPayParts, TakeHomeBreakdown } from "./TakeHomeBreakdown";

const base = {
  salary: 45000,
  incomeTax: 6486,
  nationalInsurance: 2594,
  pension: 2250,
  studentLoan: 0,
};

const openDetails = () => fireEvent.click(screen.getByRole("button", { name: "Show details" }));

describe("monthlyPayParts", () => {
  it("rounds each part to whole pounds and makes them add up to the monthly pay", () => {
    const parts = monthlyPayParts(base);
    expect(parts).toEqual({
      incomeTax: 541,
      nationalInsurance: 216,
      pension: 188,
      studentLoan: 0,
      takeHome: 2805,
    });
    const sum = Object.values(parts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(Math.round(base.salary / 12));
  });
});

describe("<TakeHomeBreakdown />", () => {
  it("keeps the table behind Show details, with the take-home row, a month, in whole pounds", () => {
    render(<TakeHomeBreakdown {...base} />);
    expect(screen.queryByRole("table")).toBeNull();
    openDetails();
    const table = screen.getByRole("table", { name: "Where your pay goes each month" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getByRole("rowheader").textContent)).toEqual([
      "Income Tax",
      "National Insurance",
      "Pension",
      "Take-home pay",
    ]);
    expect(table.textContent).toContain("£541");
    expect(table.textContent).toContain("£2,805");
    expect(table.textContent).not.toMatch(/£[\d,]+\.\d{2}/);
  });

  it("adds a student loan row only when there is a repayment", () => {
    render(<TakeHomeBreakdown {...base} studentLoan={1400} />);
    openDetails();
    expect(screen.getByRole("rowheader", { name: "Student loan" })).toBeDefined();
  });

  it("draws a decorative bar of three parts, named at its ends, with no legend or figure", () => {
    const { container } = render(<TakeHomeBreakdown {...base} />);
    const bar = screen.getByTestId("pay-bar");
    expect(bar.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(bar.querySelectorAll("rect")).toHaveLength(3);
    expect(screen.getByText("Take-home pay")).toBeDefined();
    expect(screen.getByText("What comes off")).toBeDefined();
    expect(container.textContent).not.toMatch(/£/);
    expect(screen.getByRole("heading", { level: 2, name: "Where your pay goes" })).toBeDefined();
  });

  it("puts the details slot inside the disclosure, under the table", () => {
    render(<TakeHomeBreakdown {...base} details={<p>details here</p>} />);
    expect(screen.queryByText("details here")).toBeNull();
    openDetails();
    expect(screen.getByText("details here")).toBeDefined();
  });
});
