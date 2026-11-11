import type { AvalancheVsSnowballComparison } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PayoffStrategySwitcher } from "./PayoffStrategySwitcher";

const mockComparison: AvalancheVsSnowballComparison = {
  avalanche: {
    months: 18,
    debtFreeDate: "June 2027",
    totalInterest: 640,
    totalPaid: 4640,
    monthlySchedule: [],
  },
  snowball: {
    months: 20,
    debtFreeDate: "August 2027",
    totalInterest: 710,
    totalPaid: 4710,
    quickWinDebtName: "Klarna",
    quickWinMonths: 2,
    monthlySchedule: [],
  },
  minimumOnly: {
    months: 36,
    debtFreeDate: "December 2028",
    totalInterest: 1520,
    totalPaid: 5520,
    monthlySchedule: [],
  },
  interestSavedAvalancheVsMin: 880,
  monthsShavedAvalancheVsMin: 18,
  interestSavedAvalancheVsSnowball: 70,
  snowballFirstWinDescription: "Clear your Klarna in 2 months",
};

describe("PayoffStrategySwitcher", () => {
  it("renders Avalanche and Snowball strategies and allows toggling", () => {
    const handleSelect = vi.fn();
    const handleExtra = vi.fn();

    render(
      <PayoffStrategySwitcher
        budgetSurplus={150}
        comparison={mockComparison}
        extraPayment={50}
        selectedStrategy="avalanche"
        onChangeExtraPayment={handleExtra}
        onSelectStrategy={handleSelect}
      />,
    );

    expect(screen.getByText(/Payoff Strategy: Avalanche vs. Snowball/i)).toBeDefined();
    expect(screen.getByText(/Avalanche \(Highest APR\)/i)).toBeDefined();
    expect(screen.getByText(/Snowball \(Smallest Balance\)/i)).toBeDefined();

    const snowballBtn = screen.getByRole("radio", { name: /Select Snowball strategy/i });
    fireEvent.click(snowballBtn);
    expect(handleSelect).toHaveBeenCalledWith("snowball");
  });

  it("handles slider input changes", () => {
    const handleExtra = vi.fn();

    render(
      <PayoffStrategySwitcher
        budgetSurplus={150}
        comparison={mockComparison}
        extraPayment={50}
        selectedStrategy="avalanche"
        onChangeExtraPayment={handleExtra}
        onSelectStrategy={vi.fn()}
      />,
    );

    const slider = screen.getByRole("slider", { name: /Extra monthly debt overpayment/i });
    fireEvent.change(slider, { target: { value: "100" } });
    expect(handleExtra).toHaveBeenCalledWith(100);
  });

  it("exposes the selection as a radiogroup", () => {
    render(
      <PayoffStrategySwitcher
        comparison={mockComparison}
        extraPayment={50}
        selectedStrategy="avalanche"
        onChangeExtraPayment={vi.fn()}
        onSelectStrategy={vi.fn()}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Payoff strategy" })).toBeDefined();
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    expect(radios.map((r) => r.checked)).toEqual([true, false, false]);
  });

  it("arrow keys change strategy", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(
      <PayoffStrategySwitcher
        comparison={mockComparison}
        extraPayment={50}
        selectedStrategy="avalanche"
        onChangeExtraPayment={vi.fn()}
        onSelectStrategy={handleSelect}
      />,
    );
    screen.getAllByRole("radio")[0].focus();
    await user.keyboard("{ArrowDown}");
    expect(handleSelect).toHaveBeenCalledWith("snowball");
  });
});
