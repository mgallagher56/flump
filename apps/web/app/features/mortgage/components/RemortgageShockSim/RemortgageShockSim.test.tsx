import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RemortgageShockSim } from "./RemortgageShockSim";

// Catches £0, £0.00 and £0,000 alike.
const ZERO_MONEY = /£\s*0(?:[,.]0+)*(?!\d)/;

describe("RemortgageShockSim", () => {
  it("renders remortgage shock simulator, monthly shock, and target LTV milestone", () => {
    render(
      <RemortgageShockSim
        currentBalance={280000}
        currentRate={2.5}
        fixEndDate="2099-10-01"
        propertyValue={350000}
      />,
    );

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
    expect(container.textContent ?? "").not.toMatch(ZERO_MONEY);
  });

  it("does not invent a property value when none is supplied", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} />);
    expect(screen.getByText("LTV not set")).toBeDefined();
    expect(screen.queryByText(/target ltv tier/i)).toBeNull();
  });

  it("uses a real property value when supplied", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} propertyValue={350000} />);
    expect(screen.queryByText("LTV not set")).toBeNull();
    expect(screen.getByText(/current LTV: 80.0%/i)).toBeDefined();
  });

  it("does not invent a fix end date", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} propertyValue={350000} />);
    expect(screen.getByText(/fix end date not set/i)).toBeDefined();
    expect(screen.queryByText(/months remaining/i)).toBeNull();
  });

  it("seeds the end date and term from the user's own figures", () => {
    render(
      <RemortgageShockSim
        currentBalance={280000}
        currentRate={2.5}
        fixEndDate="2099-10-01"
        remainingTermYears={18}
      />,
    );
    expect(screen.getByText(/months remaining on current 2.5% fix/i)).toBeDefined();
    expect(
      (screen.getByLabelText("Remaining term (years) range slider") as HTMLInputElement).value,
    ).toBe("18");
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
