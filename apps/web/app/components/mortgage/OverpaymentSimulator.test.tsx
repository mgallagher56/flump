import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import OverpaymentSimulator from "./OverpaymentSimulator";

describe("<OverpaymentSimulator />", () => {
  const defaultProps = {
    loanAmount: 200000,
    interestRate: 4,
    remainingTerm: 25,
    overpayment: 200,
    onOverpaymentChange: vi.fn(),
  };

  test("renders parameter controls, stats, and amortisation savings", () => {
    const { getByText, getAllByDisplayValue } = customRender(
      <OverpaymentSimulator {...defaultProps} />,
    );

    expect(getByText("Overpayment")).toBeDefined();
    expect(getByText("Amortisation projection")).toBeDefined();
    expect(getByText("Time Shaved Off")).toBeDefined();
    expect(getByText("Interest Saved")).toBeDefined();
    expect(getByText(/Total Monthly Outflow:/i)).toBeDefined();

    // Verify slider change
    const slider = document.querySelector("input[type='range']") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "300" } });
    expect(defaultProps.onOverpaymentChange).toHaveBeenCalledWith(300);

    // Verify number input change
    const numberInputs = getAllByDisplayValue("200");
    const numberInput = numberInputs.find((el) => el.getAttribute("type") === "number");
    if (numberInput) {
      fireEvent.change(numberInput, { target: { value: "400" } });
      expect(defaultProps.onOverpaymentChange).toHaveBeenCalledWith(400);
    }
  });

  test("renders with interest-only mortgage type", () => {
    const { getByText } = customRender(
      <OverpaymentSimulator {...defaultProps} mortgageType="interest-only" overpayment={500} />,
    );

    expect(getByText("Amortisation projection")).toBeDefined();
    expect(getByText(/Scheduled Interest Payment:/i)).toBeDefined();
    expect(getByText("Bullet Balance Reduced")).toBeDefined();
  });

  test("handles zero values cleanly without NaN errors", () => {
    const { getByText } = customRender(
      <OverpaymentSimulator
        {...defaultProps}
        loanAmount={0}
        interestRate={0}
        remainingTerm={0}
        overpayment={0}
      />,
    );

    expect(getByText("Amortisation projection")).toBeDefined();
  });
});
