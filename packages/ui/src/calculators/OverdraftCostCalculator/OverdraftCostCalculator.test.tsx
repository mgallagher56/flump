import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverdraftCostCalculator } from "./OverdraftCostCalculator";

describe("OverdraftCostCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<OverdraftCostCalculator />);
    expect(container).toBeDefined();
  });

  it("recalculates the annual cost when the balance changes", () => {
    render(<OverdraftCostCalculator />);
    const initial = screen.getByTestId("overdraft-cost-tool").textContent;
    fireEvent.change(screen.getByLabelText("Average overdraft balance used (£)"), {
      target: { value: "0" },
    });
    expect(screen.getByText(/£0 \/ year/)).toBeDefined();
    expect(screen.getByTestId("overdraft-cost-tool").textContent).not.toBe(initial);
  });

  it("calls onSaveAndContinue with the entered balance", () => {
    const onSave = vi.fn();
    render(<OverdraftCostCalculator ctaText="Go" onSaveAndContinue={onSave} />);
    fireEvent.change(screen.getByLabelText("Average overdraft balance used (£)"), {
      target: { value: "800" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 800 }));
  });

  it("formats the monthly cost in en-GB with two decimals", () => {
    render(<OverdraftCostCalculator />);
    fireEvent.change(screen.getByLabelText("Average overdraft balance used (£)"), {
      target: { value: "30000" },
    });
    expect(screen.getByText(/~£997\.50\/month/)).toBeDefined();
  });
});
