import type { AvalancheVsSnowballComparison } from "@flump/finance-engine";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
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

const baseProps = {
  budgetSurplus: 150,
  comparison: mockComparison,
  extraPayment: 50,
  selectedStrategy: "avalanche" as const,
  onChangeExtraPayment: vi.fn(),
  onSelectStrategy: vi.fn(),
};

describe("PayoffStrategySwitcher", () => {
  it("uses plain headings and factual strategy labels", () => {
    customRender(<PayoffStrategySwitcher {...baseProps} />);
    expect(screen.getByRole("heading", { level: 3, name: "Payoff order" })).toBeDefined();
    expect(screen.getByText("Highest rate first (avalanche)")).toBeDefined();
    expect(screen.getByText("Smallest balance first (snowball)")).toBeDefined();
    expect(screen.getByText("Minimum payments only")).toBeDefined();
    expect(screen.queryByText(/financial psychology/i)).toBeNull();
  });

  it("states each result as a fact, not an instruction", () => {
    customRender(<PayoffStrategySwitcher {...baseProps} />);
    expect(screen.getByText("Debt-free in 18 months, £640 interest")).toBeDefined();
    expect(screen.getByText("Debt-free in 20 months, £710 interest")).toBeDefined();
    expect(screen.getByText("Debt-free in 36 months, £1,520 interest")).toBeDefined();
    expect(screen.getByText(/debt-free 18 months sooner and £880 less interest/)).toBeDefined();
    expect(screen.queryByText(/Put an extra/)).toBeNull();
  });

  it("selecting snowball calls onSelectStrategy", () => {
    const onSelectStrategy = vi.fn();
    customRender(<PayoffStrategySwitcher {...baseProps} onSelectStrategy={onSelectStrategy} />);
    fireEvent.click(screen.getByRole("radio", { name: /Smallest balance first/ }));
    expect(onSelectStrategy).toHaveBeenCalledWith("snowball");
  });

  it("shows the same interest-vs-minimum figure for both strategies and never a negative one", () => {
    const worse = {
      ...mockComparison,
      snowball: { ...mockComparison.snowball, totalInterest: 2000 },
    };
    customRender(<PayoffStrategySwitcher {...baseProps} comparison={worse} />);
    expect(screen.getByText("£880 lower")).toBeDefined();
    expect(screen.getByText("£0 lower")).toBeDefined();
  });

  it("changes the extra payment from the slider", () => {
    const onChangeExtraPayment = vi.fn();
    customRender(
      <PayoffStrategySwitcher {...baseProps} onChangeExtraPayment={onChangeExtraPayment} />,
    );
    const slider = screen.getByRole("slider", { name: /Extra payment each month/i });
    fireEvent.change(slider, { target: { value: "100" } });
    expect(onChangeExtraPayment).toHaveBeenCalledWith(100);
  });

  it("matches the budget surplus and hides the button once matched", () => {
    const onChangeExtraPayment = vi.fn();
    const { rerender } = customRender(
      <PayoffStrategySwitcher
        {...baseProps}
        budgetSurplus={250}
        extraPayment={0}
        onChangeExtraPayment={onChangeExtraPayment}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Match surplus/i }));
    expect(onChangeExtraPayment).toHaveBeenCalledWith(250);
    rerender(
      <PayoffStrategySwitcher
        {...baseProps}
        budgetSurplus={250}
        extraPayment={250}
        onChangeExtraPayment={onChangeExtraPayment}
      />,
    );
    expect(screen.queryByRole("button", { name: /Match surplus/i })).toBeNull();
  });

  it("omits the surplus row when there is no surplus", () => {
    customRender(<PayoffStrategySwitcher {...baseProps} budgetSurplus={0} />);
    expect(screen.queryByText(/budget surplus/i)).toBeNull();
  });

  it("never seeds an extra payment when an order is chosen from zero", () => {
    const onChangeExtraPayment = vi.fn();
    customRender(
      <PayoffStrategySwitcher
        {...baseProps}
        extraPayment={0}
        onChangeExtraPayment={onChangeExtraPayment}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Smallest balance first/ }));
    expect(onChangeExtraPayment).not.toHaveBeenCalled();
  });

  it("exposes the order as a radiogroup of two radios, with minimum payments as a baseline", () => {
    customRender(<PayoffStrategySwitcher {...baseProps} />);
    expect(screen.getByRole("radiogroup", { name: "Payoff order" })).toBeDefined();
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((r) => r.checked)).toEqual([true, false]);
    expect(screen.getByText("Minimum payments only")).toBeDefined();
  });

  it("says so when a strategy never clears the debt", () => {
    const stuck = {
      ...mockComparison,
      avalanche: { ...mockComparison.avalanche, payoffAchievable: false },
    };
    customRender(<PayoffStrategySwitcher {...baseProps} comparison={stuck} />);
    expect(screen.getByText("Not cleared within the projection")).toBeDefined();
    expect(screen.getByText("Not set")).toBeDefined();
  });
});
