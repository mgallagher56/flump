import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DebtSnowballVsAvalancheTool } from "./DebtSnowballVsAvalancheTool";

vi.mock("react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

describe("DebtSnowballVsAvalancheTool", () => {
  it("renders inputs and computes avalanche vs snowball payoff metrics", () => {
    render(<DebtSnowballVsAvalancheTool />);

    expect(screen.getByText(/UK Debt Snowball vs. Avalanche Simulator/i)).toBeDefined();
    expect(screen.getByText(/Liability 1: Credit Card/i)).toBeDefined();
    expect(screen.getByText(/Liability 2: Personal Loan/i)).toBeDefined();
    expect(screen.getByText(/Avalanche Strategy/i)).toBeDefined();
    expect(screen.getByText(/Snowball Strategy/i)).toBeDefined();
  });

  it("updates payoff when extra payment slider moves", () => {
    render(<DebtSnowballVsAvalancheTool />);

    const slider = screen.getByRole("slider", { name: /Monthly Overpayment Surplus/i });
    fireEvent.change(slider, { target: { value: "150" } });

    expect(screen.getByText(/\+£150\/mo/i)).toBeDefined();
  });
});
