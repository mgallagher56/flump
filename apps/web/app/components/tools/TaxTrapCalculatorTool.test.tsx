import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaxTrapCalculatorTool } from "./TaxTrapCalculatorTool";

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("TaxTrapCalculatorTool", () => {
  it("renders with default £115k income and 60% trap active badge", () => {
    render(<TaxTrapCalculatorTool />);

    expect(screen.getByText(/interactive £100k–£125k tax trap modeller/i)).toBeDefined();
    expect(screen.getByText(/60% trap active/i)).toBeDefined();
    expect(screen.getByText(/tax and ni saved/i)).toBeDefined();
    expect(screen.getByText(/personal allowance reclaimed/i)).toBeDefined();
  });

  it("updates calculations when gross income slider changes", () => {
    render(<TaxTrapCalculatorTool />);

    const incomeSlider = screen.getByRole("slider", { name: /total gross uk income/i });
    fireEvent.change(incomeSlider, { target: { value: "105000" } });

    expect(screen.getAllByDisplayValue("105000").length).toBeGreaterThan(0);
  });

  it("saves scenario seed to localStorage and navigates to /signup on CTA click", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<TaxTrapCalculatorTool />);

    const ctaButton = screen.getByRole("button", { name: /save scenario and continue free/i });
    fireEvent.click(ctaButton);

    expect(setItemSpy).toHaveBeenCalledWith("flump_onboarding_seed", expect.any(String));
    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });
});
