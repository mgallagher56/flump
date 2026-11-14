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

  it("with the engine's take-home, shows it to the pound and keeps the sum to the monthly pay", () => {
    const annual = base.salary - base.incomeTax - base.nationalInsurance - base.pension; // 33,670
    const parts = monthlyPayParts({ ...base, takeHome: annual });
    expect(parts.takeHome).toBe(Math.round(annual / 12)); // 2,806, not the derived 2,805
    const sum = Object.values(parts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(Math.round(base.salary / 12));
    // The pound of rounding comes off the largest deduction, Income Tax.
    expect(parts.incomeTax).toBe(540);
    expect(parts.nationalInsurance).toBe(216);
  });

  it("keeps the parts adding up across salaries when given the engine's take-home", () => {
    for (const salary of [18_000, 32_000, 58_000, 123_456]) {
      const f = {
        salary,
        incomeTax: salary * 0.17 + 0.4,
        nationalInsurance: salary * 0.06 + 0.3,
        pension: salary * 0.05,
        studentLoan: salary > 30_000 ? (salary - 28_470) * 0.09 : 0,
      };
      const takeHome = salary - f.incomeTax - f.nationalInsurance - f.pension - f.studentLoan;
      const parts = monthlyPayParts({ ...f, takeHome });
      expect(parts.takeHome).toBe(Math.round(takeHome / 12));
      expect(Object.values(parts).reduce((a, b) => a + b, 0)).toBe(Math.round(salary / 12));
    }
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
    expect(screen.getByText("Tax, National Insurance, pension and student loan")).toBeDefined();
    openDetails();
    expect(screen.getByRole("rowheader", { name: "Student loan" })).toBeDefined();
  });

  it("draws a decorative bar of three parts, named at its ends, with no legend or figure", () => {
    const { container } = render(<TakeHomeBreakdown {...base} />);
    const bar = screen.getByTestId("pay-bar");
    expect(bar.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(bar.querySelectorAll("rect")).toHaveLength(3);
    expect(screen.getByText("Take-home pay")).toBeDefined();
    expect(screen.getByText("Tax, National Insurance and pension")).toBeDefined();
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
