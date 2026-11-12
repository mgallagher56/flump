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

  it("trap copy names both rates from the engine and never contradicts itself", () => {
    const { container } = render(<TaxTrapAlertBanner grossIncome={115000} />);

    expect(screen.getByRole("heading", { level: 3 }).textContent).toContain("60%");
    expect(container.textContent).toContain("60% income tax, 62% including NI");
    expect(container.textContent).not.toMatch(/effective 62% marginal tax rate/);
  });

  it("near the trap shows the 40% income tax rate and does not claim 62%", () => {
    render(<TaxTrapAlertBanner grossIncome={97000} />);
    expect(screen.getByText("40% Marginal Tax")).toBeDefined();
    expect(screen.queryByText(/62%/)).toBeNull();
  });

  // Savings are the income tax difference plus employee NI difference from the engine
  // (EWNI; 2025/26 and 2026/27 share these figures: PA 12,570, basic 20% to taxable 37,700,
  // higher 40% to 125,140, additional 45%, NI 8% to 50,270 then 2%).
  it("97k income, 3k sacrifice: saves 1,260 (40% + 2% NI), not the flat 62% (1,860)", () => {
    // Tax(97,000) = 7,540 + 46,730*.4 = 26,232; Tax(94,000) = 7,540 + 43,730*.4 = 25,032;
    // diff 1,200; NI 3,000*.02 = 60; total 1,260.
    render(<TaxTrapAlertBanner grossIncome={97000} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "3000" } });
    expect(screen.getByText("£1,260 / yr")).toBeDefined();
    expect(screen.queryByText("£1,860 / yr")).toBeNull();
  });

  it("130k income, 25,140 sacrifice: saves 14,858 (not the flat 62% 15,587)", () => {
    // Tax(130,000) = 7,540 + 34,976 + 2,187 = 44,703 (PA 0);
    // Tax(104,860): PA 12,570 - 2,430 = 10,140, taxable 94,720 => 7,540 + 22,808 = 30,348;
    // diff 14,355; NI 25,140*.02 = 502.80; total 14,857.80 => rounds to 14,858.
    render(<TaxTrapAlertBanner grossIncome={130000} />);
    expect(screen.getByText("£14,858 / yr")).toBeDefined();
    expect(screen.queryByText("£15,587 / yr")).toBeNull();
  });
});
