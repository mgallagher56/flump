import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PayoffStrategyControls } from "./PayoffStrategyControls";

describe("PayoffStrategyControls Feature Component", () => {
  it("renders avalanche and snowball choices and handles toggle", () => {
    const handleSelect = vi.fn();
    const handleAmount = vi.fn();

    render(
      <PayoffStrategyControls
        extraPayment={50}
        interestSaved={2450}
        selectedStrategy="avalanche"
        onChangeExtraPayment={handleAmount}
        onSelectStrategy={handleSelect}
      />,
    );

    expect(screen.getByText("Payoff Strategy: Avalanche vs. Snowball")).toBeDefined();
    expect(screen.getByText("£2,450 Saved")).toBeDefined();

    const snowballBtn = screen.getByRole("button", { name: "Select Snowball strategy" });
    fireEvent.click(snowballBtn);
    expect(handleSelect).toHaveBeenCalledWith("snowball");
  });
});
