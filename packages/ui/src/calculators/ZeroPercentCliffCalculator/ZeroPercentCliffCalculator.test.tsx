import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ZeroPercentCliffCalculator } from "./ZeroPercentCliffCalculator";

describe("ZeroPercentCliffCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<ZeroPercentCliffCalculator />);
    expect(container).toBeDefined();
  });

  it("updates the target payment when the months change", () => {
    render(<ZeroPercentCliffCalculator />);
    const initial = screen.getByTestId("zero-percent-cliff-tool").textContent;
    fireEvent.change(screen.getByLabelText("Months remaining on 0% offer"), {
      target: { value: "6" },
    });
    expect(screen.getByTestId("zero-percent-cliff-tool").textContent).not.toBe(initial);
  });

  it("calls onSaveAndContinue with the balance", () => {
    const onSave = vi.fn();
    render(<ZeroPercentCliffCalculator ctaText="Go" onSaveAndContinue={onSave} />);
    fireEvent.change(screen.getByLabelText("Current 0% card balance (£)"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 5000 }));
  });
});
