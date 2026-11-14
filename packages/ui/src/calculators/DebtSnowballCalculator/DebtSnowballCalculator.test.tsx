import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DebtSnowballCalculator } from "./DebtSnowballCalculator";
import { liabilityFieldsStyle } from "./DebtSnowballCalculator.styles";

describe("DebtSnowballCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<DebtSnowballCalculator />);
    expect(container).toBeDefined();
  });

  it("recalculates the headline when the overpayment changes", () => {
    render(<DebtSnowballCalculator />);
    const before = screen.getByText(/Debt free:/).textContent;
    fireEvent.change(screen.getByLabelText("Extra each month slider"), {
      target: { value: "500" },
    });
    expect(screen.getByText(/Debt free:/).textContent).not.toEqual(before);
    expect(
      (screen.getByLabelText("Extra each month, on top of the minimums") as HTMLInputElement).value,
    ).toBe("500");
  });

  it("passes the total debt to onSaveAndContinue", () => {
    const onSave = vi.fn();
    render(<DebtSnowballCalculator ctaText="Continue" onSaveAndContinue={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 8500 }));
  });

  it("has no inline styles", () => {
    const { container } = render(<DebtSnowballCalculator />);
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("stacks the liability fields on a phone and only goes three across from sm up", () => {
    // Pre-release defect 10: three 1fr columns of default-width inputs were 688px wide at 375.
    const classes = liabilityFieldsStyle.split(" ");
    expect(classes.some((c) => /^grid-tc_repeat\(3/.test(c))).toBe(false);
    expect(classes.some((c) => /^sm:grid-tc_repeat\(3,_minmax\(0,_1fr\)\)$/.test(c))).toBe(true);
  });

  it("shows both strategies' total interest from the engine, in sentence case", () => {
    render(<DebtSnowballCalculator />);
    const text = screen.getByTestId("debt-snowball-tool").textContent ?? "";
    const matches = text.match(/total interest £[\d,]+/g) ?? [];
    expect(matches).toHaveLength(2);
    expect(text).toContain("Snowball clears the credit card first");
    expect(text).not.toMatch(/Credit Card|Personal Loan/);
  });

  it("says plainly when the payments cannot clear the debts", () => {
    render(<DebtSnowballCalculator />);
    fireEvent.change(document.getElementById("debt-card-min") as HTMLInputElement, {
      target: { value: "1" },
    });
    fireEvent.change(document.getElementById("debt-card-balance") as HTMLInputElement, {
      target: { value: "900000" },
    });
    fireEvent.change(screen.getByLabelText("Extra each month slider"), { target: { value: "0" } });
    const text = screen.getByTestId("debt-snowball-tool").textContent ?? "";
    expect(text).toContain("These payments would not clear the debts");
    expect(text).not.toMatch(/Debt free: Not payable/);
  });

  it("hides the minimums-only comparison when the minimums alone would never clear the debts", () => {
    render(<DebtSnowballCalculator />);
    // £5 a month on a £3,500 card at 24.9% never clears (interest is about £73 a month).
    fireEvent.change(document.getElementById("debt-card-min") as HTMLInputElement, {
      target: { value: "5" },
    });
    const text = screen.getByTestId("debt-snowball-tool").textContent ?? "";
    expect(text).toContain("Paying only the minimums would not clear these debts");
    expect(text).not.toContain("Interest saved compared with paying only the minimums");
  });
});
