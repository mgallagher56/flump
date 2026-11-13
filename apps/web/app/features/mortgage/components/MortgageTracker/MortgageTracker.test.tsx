import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { MortgageTracker } from "./MortgageTracker";

describe("<MortgageTracker />", () => {
  const defaultProps = {
    loanAmount: 150000,
    interestRate: 4.5,
    remainingTerm: 25,
    mortgageAccounts: [
      { id: "m1", name: "HSBC Fixed Mortgage", type: "Mortgage", balance: -135400 },
    ],
    selectedAccountId: null,
    onSelectAccount: vi.fn(),
  };

  test("shows the saved cost breakdown with no editable controls", () => {
    const { getByText, queryByText, container } = customRender(
      <MortgageTracker {...defaultProps} />,
    );
    expect(getByText("Mortgage cost breakdown")).toBeDefined();
    // 150k at 4.5% over 25 years is about £834 a month.
    expect(getByText(/£834/)).toBeDefined();
    expect(getByText(/40.0% of total cost is interest/)).toBeDefined();
    expect(container.querySelectorAll("input[type='range']")).toHaveLength(0);
    expect(queryByText("Mortgage repayment structure")).toBeNull();
  });

  test("shows interest-only figures for an interest-only mortgage", () => {
    const { getByText } = customRender(
      <MortgageTracker {...defaultProps} mortgageType="interest-only" />,
    );
    // 150,000 * 0.045 / 12 = £562.50
    expect(getByText(/£563/)).toBeDefined();
    expect(getByText("Principal bullet due at term end")).toBeDefined();
  });

  test("lets the user pick which linked account the figures come from", () => {
    const { getByTestId } = customRender(<MortgageTracker {...defaultProps} />);
    fireEvent.change(getByTestId("tracker-account-select"), { target: { value: "m1" } });
    expect(defaultProps.onSelectAccount).toHaveBeenCalledWith("m1");
  });

  test("renders Not set, not zero, when the inputs are unknown", () => {
    const { container, getAllByText, queryByText } = customRender(
      <MortgageTracker {...defaultProps} loanAmount={0} interestRate={0} remainingTerm={0} />,
    );

    expect(getAllByText("Not set").length).toBeGreaterThanOrEqual(3);
    expect(queryByText(/£\s*0(?:[,.]0+)*(?!\d)/)).toBeNull();
    expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
  });
});
