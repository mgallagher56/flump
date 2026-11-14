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

    expect(screen.getByRole("heading", { name: /mortgage overpayment or isa/i })).toBeDefined();
    expect(screen.getByText(/overpaying: estimated interest saved/i)).toBeDefined();
    expect(screen.getByText(/isa: estimated balance/i)).toBeDefined();
  });

  it("updates simulation when monthly contribution changes", () => {
    render(<MortgageVsIsaTool />);

    const monthlySlider = screen.getByRole("slider", { name: /extra money a month range slider/i });
    fireEvent.change(monthlySlider, { target: { value: "500" } });

    expect((monthlySlider as HTMLInputElement).value).toBe("500");
  });

  it("persists seed and redirects to /signup on CTA", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<MortgageVsIsaTool />);

    const ctaButton = screen.getByRole("button", { name: /continue to sign up/i });
    fireEvent.click(ctaButton);

    expect(setItemSpy).toHaveBeenCalledWith("flump_onboarding_seed", expect.any(String));
    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });
});
