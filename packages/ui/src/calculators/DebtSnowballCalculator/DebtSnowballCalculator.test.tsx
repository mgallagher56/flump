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
    fireEvent.change(screen.getByLabelText("Monthly overpayment surplus slider"), {
      target: { value: "500" },
    });
    expect(screen.getByText(/Debt free:/).textContent).not.toEqual(before);
    expect((screen.getByLabelText("Monthly overpayment surplus") as HTMLInputElement).value).toBe(
      "500",
    );
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
});
