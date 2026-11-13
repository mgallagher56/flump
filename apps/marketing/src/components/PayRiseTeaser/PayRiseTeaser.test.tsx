import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_SALARY_GBP, PayRiseTeaser, payRiseResult } from "./PayRiseTeaser";

describe("payRiseResult", () => {
  it("keeps 72% of a rise inside the basic rate band (20% tax, 8% NI)", () => {
    const r = payRiseResult(39_000, 2_000);
    expect(r.keptAnnual).toBeCloseTo(1_440, 0);
    expect(r.extraIncomeTax).toBeCloseTo(400, 0);
    expect(r.extraNationalInsurance).toBeCloseTo(160, 0);
    expect(r.keptPct).toBeCloseTo(72, 0);
    expect(r.entersTaperBand).toBe(false);
  });

  it("flags the taper band only when the visitor's own figures reach it", () => {
    expect(payRiseResult(99_000, 2_000).entersTaperBand).toBe(true);
    expect(payRiseResult(130_000, 2_000).entersTaperBand).toBe(false);
    expect(payRiseResult(60_000, 5_000).entersTaperBand).toBe(false);
  });
});

describe("PayRiseTeaser", () => {
  it("starts from a typical salary, not the £100k band, and shows no taper note", () => {
    render(<PayRiseTeaser />);
    expect(DEFAULT_SALARY_GBP).toBe(39_000);
    expect(screen.getByText("UK take-home")).toBeDefined();
    const outcome = screen.getByTestId("pay-rise-outcome");
    expect(within(outcome).getByText("£1,440 a year of £2,000")).toBeDefined();
    expect(screen.queryByText("Personal Allowance taper")).toBeNull();
  });

  it("updates the estimate when the rise changes and explains the taper if reached", () => {
    render(<PayRiseTeaser />);
    fireEvent.change(screen.getByLabelText("Pay rise (a year) range slider"), {
      target: { value: "1000" },
    });
    expect(screen.getByText("£720 a year of £1,000")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Current salary (before tax) range slider"), {
      target: { value: "99500" },
    });
    expect(screen.getByText("Personal Allowance taper")).toBeDefined();
  });

  it("labels the figures as an example", () => {
    render(<PayRiseTeaser />);
    expect(screen.getByText(/Example only/)).toBeDefined();
  });
});
