import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IncomeMultipleTool } from "./IncomeMultipleTool";

const noop = {
  onPrimaryIncomeChange: vi.fn(),
  onSecondIncomeChange: vi.fn(),
  onLowMultipleChange: vi.fn(),
  onHighMultipleChange: vi.fn(),
  onDepositChange: vi.fn(),
  onBuyingCostsChange: vi.fn(),
};

describe("IncomeMultipleTool", () => {
  it("computes the hand-worked borrowing range for £38,000 + £27,000 at 4 to 4.5x", () => {
    // £65,000 * 4 = £260,000; £65,000 * 4.5 = £292,500 -> ~£293,000 (3 sig figs).
    render(
      <IncomeMultipleTool
        buyingCostsGbp={null}
        depositGbp={null}
        highMultiple={4.5}
        lowMultiple={4}
        primaryAnnualIncomeGbp={38000}
        secondAnnualIncomeGbp={27000}
        {...noop}
      />,
    );

    expect(screen.getByTestId("income-multiple-result").textContent).toContain(
      "~£260,000 to ~£293,000",
    );
    expect(
      screen.getByText(
        "Assumption: 4 to 4.5 times yearly income. Lenders set their own limits and checks. You can change these.",
      ),
    ).not.toBeNull();
  });

  it("shows property price and LTV range when deposit is entered", () => {
    render(
      <IncomeMultipleTool
        buyingCostsGbp={null}
        depositGbp={30000}
        highMultiple={4.5}
        lowMultiple={4}
        primaryAnnualIncomeGbp={38000}
        secondAnnualIncomeGbp={27000}
        {...noop}
      />,
    );

    const text = screen.getByTestId("income-multiple-result").textContent ?? "";
    expect(text).toContain("With a £30,000 deposit");
    expect(text).toContain("Property price ~£290,000 to ~£323,000");
  });

  it("calls onLowMultipleChange when the lower multiple is edited", () => {
    const onLowMultipleChange = vi.fn();
    render(
      <IncomeMultipleTool
        buyingCostsGbp={null}
        depositGbp={null}
        highMultiple={4.5}
        lowMultiple={4}
        primaryAnnualIncomeGbp={38000}
        secondAnnualIncomeGbp={null}
        {...noop}
        onLowMultipleChange={onLowMultipleChange}
      />,
    );

    const lowInput = screen.getByLabelText("Lower multiple of yearly income");
    fireEvent.change(lowInput, { target: { value: "3.5" } });
    expect(onLowMultipleChange).toHaveBeenCalledWith(3.5);
  });

  it("shows empty prompt when combined income is 0", () => {
    render(
      <IncomeMultipleTool
        buyingCostsGbp={null}
        depositGbp={null}
        highMultiple={4.5}
        lowMultiple={4}
        primaryAnnualIncomeGbp={null}
        secondAnnualIncomeGbp={null}
        {...noop}
      />,
    );

    expect(screen.getByTestId("income-multiple-result").textContent).toContain(
      "Enter yearly income to see an estimated borrowing range.",
    );
  });
});
