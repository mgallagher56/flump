import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RateChangeTool } from "./RateChangeTool";

describe("RateChangeTool", () => {
  it("computes the hand-worked payments for £200,000 over 25 years at 4% +/- 2 points", () => {
    // At 4%: £1,055.67 -> £1,056. At 6%: £1,288.60 -> £1,289 (+£233). At 2%: £847.71 -> £848 (-£208).
    render(
      <RateChangeTool
        annualRatePct={4}
        deltaPct={2}
        loanGbp={200000}
        mode="new-loan"
        referenceDate={new Date("2026-11-21T00:00:00Z")}
        termYears={25}
      />,
    );

    expect(screen.getByTestId("rate-change-result").textContent).toContain("£1,056");
    const comparisons = screen.getByTestId("rate-change-comparisons").textContent ?? "";
    expect(comparisons).toContain("Payment at 6%, 2 points higher");
    expect(comparisons).toContain("£1,289 (+£233)");
    expect(comparisons).toContain("Payment at 2%, 2 points lower");
    expect(comparisons).toContain("£848 (−£208)");
  });

  it("floors the lower rate at 0%", () => {
    // £120,000 over 20 years at 1.5% less 2 points -> 0% -> £500.
    render(
      <RateChangeTool
        annualRatePct={1.5}
        deltaPct={2}
        loanGbp={120000}
        mode="new-loan"
        referenceDate={new Date("2026-11-21T00:00:00Z")}
        termYears={20}
      />,
    );

    const comparisons = screen.getByTestId("rate-change-comparisons").textContent ?? "";
    expect(comparisons).toContain("Payment at 0%, 2 points lower");
    expect(comparisons).toContain("£500");
  });

  it("projects balance to fix-end date when fixEndDate is in the future", () => {
    // Fix ends in 2 months: £100,000 at 3% over 240 months, paying £500 -> balance £99,499.38 -> £99,499.
    render(
      <RateChangeTool
        annualRatePct={3}
        currentMonthlyPaymentGbp={500}
        deltaPct={1}
        fixEndDate="2027-01-21"
        loanGbp={100000}
        mode="saved-mortgage"
        referenceDate={new Date("2026-11-21T00:00:00Z")}
        termYears={20}
      />,
    );

    expect(screen.getByTestId("rate-change-result").textContent).toContain(
      "Starting from your estimated balance of £99,499 when your fixed rate ends in January 2027.",
    );
  });

  it("updates payments when the rate change slider is adjusted", () => {
    render(
      <RateChangeTool
        annualRatePct={4}
        deltaPct={1}
        loanGbp={200000}
        mode="saved-mortgage"
        referenceDate={new Date("2026-11-21T00:00:00Z")}
        termYears={25}
      />,
    );

    const slider = screen.getByRole("slider", { name: "Rate change, in percentage points" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(screen.getByTestId("rate-change-comparisons").textContent).toContain(
      "Payment at 6%, 2 points higher",
    );
  });

  it("shows empty prompt when loan or rate is missing", () => {
    render(<RateChangeTool annualRatePct={null} loanGbp={null} mode="new-loan" termYears={25} />);

    expect(screen.getByTestId("rate-change-result").textContent).toContain(
      "Add a loan amount, interest rate and term to see how rate changes affect the payment.",
    );
    expect(screen.queryByTestId("rate-change-comparisons")).toBeNull();
  });
});
