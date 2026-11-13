import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

describe("TaxTrapCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<TaxTrapCalculator />);
    expect(container).toBeDefined();
  });

  it("labels results as estimates, never guarantees", () => {
    const { container } = render(<TaxTrapCalculator />);
    expect(screen.getByText("Estimated tax and NI saved")).toBeDefined();
    expect(screen.getByText("Estimate, not a guarantee")).toBeDefined();
    expect(container.textContent).not.toMatch(/guaranteed/i);
    expect(screen.getByTestId("tax-trap-estimate-note").textContent).toContain(
      "Estimate for 2026/27, based on the figures you entered",
    );
  });

  it("announces the estimated headline through its single live region", () => {
    render(<TaxTrapCalculator />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("switches the marginal rate once sacrifice clears the trap", () => {
    render(<TaxTrapCalculator />);
    expect(screen.getByText("62.0%")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Annual pension salary sacrifice slider"), {
      target: { value: "20000" },
    });
    expect(screen.getByText("42.0%")).toBeDefined();
  });

  it("saves the scenario through onSaveAndContinue", () => {
    const onSave = vi.fn();
    render(<TaxTrapCalculator ctaText="Continue" onSaveAndContinue={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ annualIncome: 115000 }));
  });

  it("has no inline styles", () => {
    const { container } = render(<TaxTrapCalculator />);
    expect(container.querySelector("[style]")).toBeNull();
  });
});
