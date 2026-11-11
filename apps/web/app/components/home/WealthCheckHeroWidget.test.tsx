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

  it("never shows invented fallback figures while data is absent", () => {
    const { container } = render(<WealthCheckHeroWidget />);
    fireEvent.change(screen.getByLabelText("Total card and loan liabilities"), {
      target: { value: "0" },
    });
    expect(container.textContent).not.toMatch(/720/);
    expect(container.textContent).not.toMatch(/11,500/);
    expect(screen.getAllByText("Not calculated")).toHaveLength(2);
  });

  it("shows a calculated zero as £0 rather than Not calculated", () => {
    render(<WealthCheckHeroWidget />);
    fireEvent.change(screen.getByLabelText("Total card and loan liabilities"), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText("Average APR rate"), { target: { value: "0" } });
    const label = screen.getByText("Interest saved via avalanche strategy");
    const value = label.nextElementSibling as HTMLElement;
    expect(value.textContent).toBe("£0");
    expect(value.className).not.toBe("");
    expect(screen.queryAllByText("Not calculated")).toHaveLength(0);
  });
});
