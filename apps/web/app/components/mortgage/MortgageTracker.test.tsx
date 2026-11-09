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
    expect(getByText("Mortgage cost breakdown")).toBeDefined();
    expect(getByText(/Outstanding mortgage balance/i)).toBeDefined();

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

  test("supports switching to Interest Only mortgage", () => {
    const onMortgageTypeChange = vi.fn();
    const { getByText } = customRender(
      <MortgageTracker
        {...defaultProps}
        mortgageType="interest-only"
        onMortgageTypeChange={onMortgageTypeChange}
      />,
    );

    // Verify interest-only monthly payment (150,000 * 0.045 / 12 = £562.50 -> approx £563/mo)
    expect(getByText(/£563/)).toBeDefined();
    expect(getByText("Principal Bullet Due at Term End")).toBeDefined();
    expect(getByText("100% of principal remains outstanding at term completion.")).toBeDefined();

    // Click Repayment
    const repaymentBtn = getByText("Repayment");
    fireEvent.click(repaymentBtn);
    expect(onMortgageTypeChange).toHaveBeenCalledWith("repayment");
  });
});
