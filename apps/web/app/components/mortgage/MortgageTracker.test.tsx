import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import MortgageTracker from "./MortgageTracker";

describe("<MortgageTracker />", () => {
  const defaultProps = {
    loanAmount: 150000,
    interestRate: 4.5,
    remainingTerm: 25,
    onLoanAmountChange: vi.fn(),
    onInterestRateChange: vi.fn(),
    onRemainingTermChange: vi.fn(),
    mortgageAccounts: [
      { id: "m1", name: "HSBC Fixed Mortgage", type: "Mortgage", balance: -135400 },
    ],
    selectedAccountId: null,
    onSelectAccount: vi.fn(),
  };

  test("renders loan parameters and calculates payment breakdown", () => {
    const { getByText, getByLabelText } = customRender(<MortgageTracker {...defaultProps} />);

    // Verify labels and title
    expect(getByText("Mortgage Cost Breakdown")).toBeDefined();
    expect(getByText("Outstanding Mortgage Balance")).toBeDefined();

    // Verify calculated scheduled monthly payment is rendered (150k at 4.5% over 25yrs is approx £834/mo)
    expect(getByText(/£834/)).toBeDefined();

    // Verify interest percentage display
    expect(getByText(/40.0% of total cost is interest/)).toBeDefined();
  });

  test("calls handlers when input ranges change", () => {
    const { getByLabelText } = customRender(<MortgageTracker {...defaultProps} />);
    const sliders = document.querySelectorAll("input[type='range']");

    // Slider 0: Loan Amount
    fireEvent.change(sliders[0], { target: { value: "200000" } });
    expect(defaultProps.onLoanAmountChange).toHaveBeenCalledWith(200000);

    // Slider 1: Interest Rate
    fireEvent.change(sliders[1], { target: { value: "5.5" } });
    expect(defaultProps.onInterestRateChange).toHaveBeenCalledWith(5.5);

    // Slider 2: Term
    fireEvent.change(sliders[2], { target: { value: "20" } });
    expect(defaultProps.onRemainingTermChange).toHaveBeenCalledWith(20);
  });
});
