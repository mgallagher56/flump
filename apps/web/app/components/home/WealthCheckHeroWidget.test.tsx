import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WealthCheckHeroWidget } from "./WealthCheckHeroWidget";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("WealthCheckHeroWidget", () => {
  it("interacts with debt and wealth tabs, inputs, preset chips, and CTA navigation", () => {
    render(<WealthCheckHeroWidget />);

    // Default tab is debt
    expect(screen.getByText(/Calculate your debt-free exit date/i)).toBeTruthy();

    const debtInput = screen.getByLabelText("Total card and loan liabilities");
    fireEvent.change(debtInput, { target: { value: "8000" } });

    const aprInput = screen.getByLabelText("Average APR rate");
    fireEvent.change(aprInput, { target: { value: "24" } });

    const budgetInput = screen.getByLabelText("Monthly budget for debt");
    fireEvent.change(budgetInput, { target: { value: "400" } });

    // Click debt preset chips
    fireEvent.click(screen.getByRole("button", { name: "£12,000" }));
    fireEvent.click(screen.getByRole("button", { name: "0% BT Card" }));
    fireEvent.click(screen.getByRole("button", { name: "£450/mo" }));

    // Save debt baseline
    fireEvent.click(screen.getByRole("button", { name: /Start your debt payoff plan/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/signUp");

    // Switch to wealth tab
    fireEvent.click(screen.getByRole("button", { name: /Build wealth and optimise tax/i }));

    // Click wealth preset chips including £105,000 (in tax trap) and £38,000 (outside trap)
    fireEvent.click(screen.getByRole("button", { name: "£105,000" }));
    expect(screen.getByText(/60% Personal Allowance trap active/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "£75,000" }));
    fireEvent.click(screen.getByRole("button", { name: "£1,200/mo" }));

    // Save wealth baseline
    fireEvent.click(
      screen.getByRole("button", { name: /Save this baseline and unlock your forecast/i }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/signUp");
  });
});
