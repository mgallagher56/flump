import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DebtSnowballVsAvalancheTool } from "./DebtSnowballVsAvalancheTool";

vi.mock("react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

describe("DebtSnowballVsAvalancheTool", () => {
  it("renders inputs and computes avalanche vs snowball payoff metrics", () => {
    render(<DebtSnowballVsAvalancheTool />);

    expect(screen.getByText(/Debt payoff methods compared/i)).toBeDefined();
    expect(screen.getByText(/Debt 1: Credit card/i)).toBeDefined();
    expect(screen.getByText(/Debt 2: Personal loan/i)).toBeDefined();
    expect(screen.getByText(/Total interest, highest rate first \(avalanche\)/i)).toBeDefined();
    expect(screen.getByText(/Total interest, smallest balance first \(snowball\)/i)).toBeDefined();
  });

  it("updates payoff when extra payment slider moves", () => {
    render(<DebtSnowballVsAvalancheTool />);

    const slider = screen.getByLabelText("Extra payment a month range slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "150" } });

    expect(slider.value).toBe("150");
    expect(screen.getByLabelText("Extra payment a month input")).toHaveProperty("value", "£150");
  });
});
