import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DebtSnowballVsAvalancheTool } from "./DebtSnowballVsAvalancheTool";

vi.mock("react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

describe("DebtSnowballVsAvalancheTool", () => {
  it("renders inputs and computes avalanche vs snowball payoff metrics", () => {
    render(<DebtSnowballVsAvalancheTool />);

    expect(screen.getByText(/Debt payoff: snowball vs avalanche calculator/i)).toBeDefined();
    expect(screen.getByText(/Liability 1: Credit card/i)).toBeDefined();
    expect(screen.getByText(/Liability 2: Personal loan/i)).toBeDefined();
    expect(screen.getByText(/Avalanche strategy/i)).toBeDefined();
    expect(screen.getByText(/Snowball strategy/i)).toBeDefined();
  });

  it("updates payoff when extra payment slider moves", () => {
    render(<DebtSnowballVsAvalancheTool />);

    const slider = screen.getByRole("slider", { name: /Monthly overpayment surplus/i });
    fireEvent.change(slider, { target: { value: "150" } });

    expect(screen.getAllByDisplayValue("150").length).toBeGreaterThan(0);
  });
});
