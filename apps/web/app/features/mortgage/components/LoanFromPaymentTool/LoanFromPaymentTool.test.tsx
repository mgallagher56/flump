import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoanFromPaymentTool } from "./LoanFromPaymentTool";

const noop = {
  onMonthlyPaymentChange: vi.fn(),
  onAnnualRateChange: vi.fn(),
  onTermYearsChange: vi.fn(),
  onDepositChange: vi.fn(),
  onBuyingCostsChange: vi.fn(),
};

describe("LoanFromPaymentTool", () => {
  it("computes the hand-worked loan at £1,000/mo, 4.5%, 25 years and deposit LTV", () => {
    // £1,000 at 4.5% over 25 years = £179,910.32 -> ~£180,000.
    // With £30,000 deposit: property price ~£210,000, LTV 86%.
    render(
      <LoanFromPaymentTool
        annualRatePct={4.5}
        buyingCostsGbp={null}
        depositGbp={30000}
        monthlyPaymentGbp={1000}
        referenceDate={new Date("2026-11-21T00:00:00Z")}
        termYears={25}
        {...noop}
      />,
    );

    const text = screen.getByTestId("loan-from-payment-result").textContent ?? "";
    expect(text).toContain("~£180,000");
    expect(text).toContain("With a £30,000 deposit");
    expect(text).toContain("Property price ~£210,000, loan to value 86%");
  });

  it("uses the LTV default rate range when deposit is set and rate is empty", () => {
    render(
      <LoanFromPaymentTool
        annualRatePct={null}
        buyingCostsGbp={null}
        depositGbp={50000}
        monthlyPaymentGbp={1000}
        referenceDate={new Date("2026-11-21T00:00:00Z")}
        termYears={25}
        {...noop}
      />,
    );

    expect(
      screen.getByText(/Assumption: rates seen in November 2026 for this loan to value/),
    ).not.toBeNull();
    expect(screen.queryByTestId("stale-rate-notice")).toBeNull();
    expect(screen.getByTestId("loan-from-payment-result").textContent).toContain("~£");
  });

  it("shows the stale notice when referenceDate is more than 6 months after November 2026", () => {
    render(
      <LoanFromPaymentTool
        annualRatePct={null}
        buyingCostsGbp={null}
        depositGbp={50000}
        monthlyPaymentGbp={1000}
        referenceDate={new Date("2027-07-01T00:00:00Z")}
        termYears={25}
        {...noop}
      />,
    );

    expect(screen.getByTestId("stale-rate-notice").textContent).toContain(
      "These rates are from November 2026, more than six months ago. You can type a current rate.",
    );
  });

  it("subtracts buying costs from deposit", () => {
    render(
      <LoanFromPaymentTool
        annualRatePct={4.5}
        buyingCostsGbp={5000}
        depositGbp={35000}
        monthlyPaymentGbp={1000}
        referenceDate={new Date("2026-11-21T00:00:00Z")}
        termYears={25}
        {...noop}
      />,
    );

    expect(screen.getByTestId("loan-from-payment-result").textContent).toContain(
      "With a £30,000 deposit",
    );
  });

  it("shows empty prompt when neither rate nor deposit is provided", () => {
    render(
      <LoanFromPaymentTool
        annualRatePct={null}
        buyingCostsGbp={null}
        depositGbp={null}
        monthlyPaymentGbp={1000}
        referenceDate={new Date("2026-11-21T00:00:00Z")}
        termYears={25}
        {...noop}
      />,
    );

    expect(screen.getByTestId("loan-from-payment-result").textContent).toContain(
      "Enter an interest rate or add a deposit to see an estimated loan.",
    );
  });

  it("toggles deposit and buying costs inputs behind the chevron button", () => {
    render(
      <LoanFromPaymentTool
        annualRatePct={4.5}
        buyingCostsGbp={null}
        depositGbp={null}
        monthlyPaymentGbp={1000}
        referenceDate={new Date("2026-11-21T00:00:00Z")}
        termYears={25}
        {...noop}
      />,
    );

    expect(screen.queryByLabelText("Deposit")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Deposit and buying costs/ }));
    expect(screen.getByLabelText("Deposit")).not.toBeNull();
    expect(screen.getByLabelText("Other buying costs")).not.toBeNull();
  });
});
