import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaxTrapCalculatorTool } from "./TaxTrapCalculatorTool";

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("TaxTrapCalculatorTool", () => {
  it("renders the engine-backed taper calculator with the £115k example", () => {
    render(<TaxTrapCalculatorTool />);

    expect(screen.getByText(/pensions and the personal allowance/i)).toBeDefined();
    expect(screen.getByText(/reaches your pension/i)).toBeDefined();
    expect(screen.getByText(/estimated change in take-home pay/i)).toBeDefined();
    expect(screen.getAllByDisplayValue("115000").length).toBeGreaterThan(0);
  });

  it("updates when the pay slider changes", () => {
    render(<TaxTrapCalculatorTool />);

    const incomeSlider = screen.getByRole("slider", {
      name: /pay before tax a year range slider/i,
    });
    fireEvent.change(incomeSlider, { target: { value: "105000" } });

    expect(screen.getAllByDisplayValue("105000").length).toBeGreaterThan(0);
  });

  it("saves the onboarding seed and navigates to /signup on CTA click", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<TaxTrapCalculatorTool />);

    const ctaButton = screen.getByRole("button", { name: /continue to sign up/i });
    fireEvent.click(ctaButton);

    expect(setItemSpy).toHaveBeenCalledWith("flump_onboarding_seed", expect.any(String));
    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });
});
