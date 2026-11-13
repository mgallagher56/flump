import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageVsIsaTool } from "./MortgageVsIsaTool";

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("MortgageVsIsaTool", () => {
  it("renders with default values and comparisons", () => {
    render(<MortgageVsIsaTool />);

    expect(
      screen.getByText(/mortgage overpayment vs stocks and shares isa comparator/i),
    ).toBeDefined();
    expect(screen.getAllByText(/mortgage overpay/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/stocks and shares isa pot/i)).toBeDefined();
    expect(screen.getByText(/isa net wealth spread/i)).toBeDefined();
  });

  it("updates simulation when monthly contribution changes", () => {
    render(<MortgageVsIsaTool />);

    const monthlySlider = screen.getByRole("slider", { name: /monthly extra cash/i });
    fireEvent.change(monthlySlider, { target: { value: "500" } });

    expect(screen.getAllByDisplayValue("500").length).toBeGreaterThan(0);
  });

  it("persists seed and redirects to /signup on CTA", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<MortgageVsIsaTool />);

    const ctaButton = screen.getByRole("button", { name: /model your mortgage in flump/i });
    fireEvent.click(ctaButton);

    expect(setItemSpy).toHaveBeenCalledWith("flump_onboarding_seed", expect.any(String));
    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });
});
