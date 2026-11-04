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

    expect(screen.getByText(/section 24 buy-to-let mortgage relief calculator/i)).toBeDefined();
    expect(screen.getByText(/hmrc tax due on rental/i)).toBeDefined();
    expect(screen.getByText(/true effective tax rate/i)).toBeDefined();
    expect(screen.getByText(/net cash retained/i)).toBeDefined();
  });

  it("updates calculations when rental income slider is adjusted", () => {
    render(<Section24Tool />);

    const rentalInput = screen.getByLabelText(/annual rental income/i);
    fireEvent.change(rentalInput, { target: { value: "24000" } });

    expect(screen.getByText("£24,000")).toBeDefined();
  });

  it("persists seed and redirects to /signUp on CTA", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<Section24Tool />);

    const ctaButton = screen.getByRole("button", { name: /track your properties in flump/i });
    fireEvent.click(ctaButton);

    expect(setItemSpy).toHaveBeenCalledWith("flump_onboarding_seed", expect.any(String));
    expect(mockNavigate).toHaveBeenCalledWith("/signUp");
  });
});
