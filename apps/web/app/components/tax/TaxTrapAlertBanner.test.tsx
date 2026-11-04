import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaxTrapAlertBanner from "./TaxTrapAlertBanner";

describe("TaxTrapAlertBanner", () => {
  it("does not render when gross income is below £95,000", () => {
    const { container } = render(<TaxTrapAlertBanner grossIncome={75000} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders 60% tax trap active when income is £115,000 and calculates relief", () => {
    const mockApply = vi.fn();
    render(<TaxTrapAlertBanner grossIncome={115000} onApplySacrifice={mockApply} />);

    expect(screen.getByText("UK £100k–£125k 60% Tax Trap Active")).toBeDefined();
    expect(screen.getByText("62% Marginal Tax")).toBeDefined();
    expect(screen.getByText("£7,500")).toBeDefined(); // Personal Allowance Lost

    const applyBtn = screen.getByRole("button", { name: /apply/i });
    fireEvent.click(applyBtn);
    expect(mockApply).toHaveBeenCalled();
  });
});
