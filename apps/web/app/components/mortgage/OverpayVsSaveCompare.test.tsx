import { fireEvent } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import OverpayVsSaveCompare from "./OverpayVsSaveCompare";

describe("<OverpayVsSaveCompare />", () => {
  const defaultProps = {
    loanAmount: 250000,
    interestRate: 5,
    remainingTerm: 25,
    overpayment: 300,
  };

  test("renders comparison header, parameters, and chart", () => {
    const { getByText } = customRender(<OverpayVsSaveCompare {...defaultProps} />);

    expect(getByText("Savings Parameters")).toBeDefined();
    expect(getByText(/Verdict: Overpay Mortgage/i)).toBeDefined();
    expect(getByText("Mortgage Overpay vs. Savings Comparison")).toBeDefined();
    expect(getByText(/Savings Interest Rate/i)).toBeDefined();
    expect(getByText(/Savings Tax Bracket/i)).toBeDefined();
    expect(getByText(/Horizon \(Years\)/i)).toBeDefined();
  });

  test("allows changing savings rate slider and tax wrapper select", () => {
    const { getByDisplayValue } = customRender(<OverpayVsSaveCompare {...defaultProps} />);

    // Change tax bracket
    const select = document.querySelector("select") as HTMLSelectElement;
    expect(select).toBeDefined();
    fireEvent.change(select, { target: { value: "higher" } });
    expect(getByDisplayValue("Higher Rate (40% Tax)")).toBeDefined();

    // Change horizon slider
    const sliders = document.querySelectorAll("input[type='range']");
    if (sliders.length > 1) {
      fireEvent.change(sliders[1], { target: { value: "15" } });
    }
  });

  test("renders interest-only mortgage variation and when saving beats overpaying", () => {
    const { getByText } = customRender(
      <OverpayVsSaveCompare
        {...defaultProps}
        interestRate={3.0}
        mortgageType="interest-only"
        overpayment={400}
      />,
    );

    expect(getByText(/Verdict: Save in Account \/ ISA/i)).toBeDefined();
    expect(getByText("Mortgage Overpay vs. Savings Comparison")).toBeDefined();
  });

  test("handles zero parameters cleanly", () => {
    const { getByText } = customRender(
      <OverpayVsSaveCompare loanAmount={0} interestRate={0} remainingTerm={0} overpayment={0} />,
    );

    expect(getByText("Savings Parameters")).toBeDefined();
    expect(getByText("No Overpayment Budget Set")).toBeDefined();
  });
});
