import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RemortgageShockSim } from "./RemortgageShockSim";

describe("RemortgageShockSim", () => {
  it("renders remortgage shock simulator, monthly shock, and target LTV milestone", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} propertyValue={350000} />);

    expect(screen.getByText("Mortgage deal expiry and remortgage shock simulator")).toBeDefined();
    expect(screen.getByText(/months remaining on current 2.5% fix/i)).toBeDefined();
    expect(screen.getByText(/projected payment shock/i)).toBeDefined();
    expect(screen.getByText(/target ltv tier: 75%/i)).toBeDefined();
  });

  it("empty profile (zero balance and rate) shows no NaN or Infinity", () => {
    const { container } = render(<RemortgageShockSim currentBalance={0} currentRate={0} />);
    expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
  });

  it("renders Not set rather than £0 when balance and rate are unknown", () => {
    const { container } = render(<RemortgageShockSim currentBalance={0} currentRate={0} />);
    expect(container.textContent ?? "").toContain("Not set");
    expect(container.textContent ?? "").toContain("LTV not set");
    expect(container.textContent ?? "").not.toMatch(/£0\b/);
  });

  it("does not invent a property value when none is supplied", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} />);
    expect(screen.getByText("LTV not set")).toBeDefined();
    expect(screen.queryByText(/target ltv tier/i)).toBeNull();
  });

  it("moving the projected rate slider changes the estimated payment shock", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} propertyValue={350000} />);
    const before = document.body.textContent;
    fireEvent.change(screen.getByLabelText("Projected renewal rate range slider"), {
      target: { value: "8" },
    });
    expect(
      (screen.getByLabelText("Projected renewal rate range slider") as HTMLInputElement).value,
    ).toBe("8");
    expect(document.body.textContent).not.toBe(before);
  });
});
