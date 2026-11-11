import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RemortgageShockSim from "./RemortgageShockSim";

describe("RemortgageShockSim", () => {
  it("renders remortgage shock simulator, monthly shock, and target LTV milestone", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} propertyValue={350000} />);

    expect(screen.getByText("Mortgage Deal Expiry & Remortgage Shock Simulator")).toBeDefined();
    expect(screen.getByText(/months remaining on current 2.5% fix/i)).toBeDefined();
    expect(screen.getByText(/projected payment shock/i)).toBeDefined();
    expect(screen.getByText(/target ltv tier: 75%/i)).toBeDefined();
  });

  it("empty profile (zero balance and rate) shows no NaN or Infinity", () => {
    const { container } = render(<RemortgageShockSim currentBalance={0} currentRate={0} />);
    expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
  });
});
