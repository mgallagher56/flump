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

    const snowballBtn = screen.getByRole("button", { name: /^Snowball \(Smallest Pot\)/ });
    fireEvent.click(snowballBtn);
    expect(handleSelect).toHaveBeenCalledWith("snowball");
  });

  it("shows no saving badge or months claim when no figures are supplied", () => {
    render(
      <PayoffStrategyControls
        extraPayment={50}
        selectedStrategy="avalanche"
        onChangeExtraPayment={vi.fn()}
        onSelectStrategy={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("interest-saved-badge")).toBeNull();
    expect(screen.queryByText(/Saved/)).toBeNull();
    expect(screen.queryByText(/months ahead/)).toBeNull();
  });
});
