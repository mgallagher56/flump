import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Section24Tool } from "./Section24Tool";

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("Section24Tool", () => {
  it("renders with default rental income and finance metrics", () => {
    render(<Section24Tool />);

    expect(screen.getByText(/tax on rental income under section 24/i)).toBeDefined();
    expect(screen.getAllByText(/estimated tax on rental income/i)[0]).toBeDefined();
    expect(screen.getByText(/tax as a share of taxable profit/i)).toBeDefined();
    expect(screen.getByText(/estimated cash left after costs/i)).toBeDefined();
  });

  it("updates calculations when rental income slider is adjusted", () => {
    render(<Section24Tool />);

    const rentalSlider = screen.getByRole("slider", { name: /rental income a year/i });
    fireEvent.change(rentalSlider, { target: { value: "24000" } });

    expect(screen.getAllByDisplayValue("24000").length).toBeGreaterThan(0);
  });

  it("persists seed and redirects to /signup on CTA", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<Section24Tool />);

    const ctaButton = screen.getByRole("button", { name: /continue to sign up/i });
    fireEvent.click(ctaButton);

    expect(setItemSpy).toHaveBeenCalledWith("flump_onboarding_seed", expect.any(String));
    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });
});
