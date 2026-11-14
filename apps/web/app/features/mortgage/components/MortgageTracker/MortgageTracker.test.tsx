import customRender from "~/testUtils/customRender";
import { MortgageTracker } from "./MortgageTracker";

describe("<MortgageTracker />", () => {
  const defaultProps = { loanAmount: 150000, interestRate: 4.5, remainingTerm: 25 };

  test("shows the saved cost details as estimates, with no editable controls", () => {
    const { getByText, container } = customRender(<MortgageTracker {...defaultProps} />);
    expect(getByText("Total interest (estimate)")).toBeDefined();
    expect(getByText("Total to pay (estimate)")).toBeDefined();
    expect(getByText(/40.0% of the total is interest/)).toBeDefined();
    // The three figures are stated once, with no sentence restating them.
    expect(container.textContent).not.toMatch(/Estimate: over|To see what overpaying/);
    expect(container.querySelectorAll("input, select")).toHaveLength(0);
    // The monthly payment is the page's hero, never repeated here.
    expect(container.textContent).not.toContain("Monthly payment");
    // No alarm colour on an ordinary interest share.
    expect(container.innerHTML).not.toMatch(/danger/);
  });

  test("shows interest-only figures for an interest-only mortgage", () => {
    const { getByText } = customRender(
      <MortgageTracker {...defaultProps} mortgageType="interest-only" />,
    );
    expect(getByText("Loan to repay at the end of the term")).toBeDefined();
    expect(getByText(/Loan to repay at the end:/)).toBeDefined();
  });

  test("works over a stored term in months without decimal noise", () => {
    const { container } = customRender(
      <MortgageTracker {...defaultProps} remainingTerm={218 / 12} />,
    );
    expect(container.textContent ?? "").not.toMatch(/NaN|Infinity|18\.1/);
  });

  test("says what is missing, never zero, when the inputs are unknown", () => {
    const { container, getByText } = customRender(
      <MortgageTracker loanAmount={0} interestRate={0} remainingTerm={0} />,
    );
    expect(getByText(/Add your balance, interest rate and years left/)).toBeDefined();
    expect(container.textContent ?? "").not.toMatch(/£|NaN|Infinity|Not set/);
  });
});
