import { act, fireEvent } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import ForecastContainer from "./ForecastContainer";

// Mock child components to keep this integration/container test simple
vi.mock("app/components/forecast/SavingsForecaster", () => ({
  default: ({ onClearIncrease, onCurrentRateChange }: any) => (
    <div id="mock-forecaster">
      Mock Savings Forecaster
      <button type="button" onClick={() => onCurrentRateChange(999)}>
        Change Rate
      </button>
      <button type="button" onClick={onClearIncrease}>
        Clear Increase
      </button>
    </div>
  ),
}));

vi.mock("app/components/forecast/UKTaxCalculator", () => ({
  default: ({ onApplyIncrease }: any) => (
    <div id="mock-calculator">
      Mock UK Tax Calculator
      <button type="button" onClick={() => onApplyIncrease(300)}>
        Apply Raise
      </button>
    </div>
  ),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  const mockData = {
    accounts: [{ id: "1", name: "Main current account", type: "Current", balance: 5000 }],
    accountDetails: [
      { account_id: "1", month: 11, year: 2023, value: 4500 },
      { account_id: "1", month: 12, year: 2023, value: 5000 },
    ],
    userProfile: {
      annualSalary: 105000,
      setupChecklistCompletedSteps: ["forecast"],
    },
  };
  return {
    ...actual,
    useLoaderData: vi.fn(() => mockData),
  };
});

describe("<ForecastContainer />", () => {
  test("renders correctly and allows tab switching and applying salary increase", () => {
    const { container, getByText } = customRender(<ForecastContainer />);
    expect(container).toBeDefined();

    // Verify title and initial active tab (Savings Forecaster)
    expect(getByText("Forecast and tools")).toBeDefined();
    expect(container.querySelector("#mock-forecaster")).toBeDefined();
    expect(container.querySelector("#mock-calculator")).toBeNull();

    // Click on UK take-home pay calculator tab
    const calcTabBtn = getByText("UK take-home pay calculator");
    fireEvent.click(calcTabBtn);

    // Verify view switch
    expect(container.querySelector("#mock-calculator")).toBeDefined();
    expect(container.querySelector("#mock-forecaster")).toBeNull();

    // Apply salary increase -> switches back to forecaster
    fireEvent.click(getByText("Apply Raise"));
    expect(container.querySelector("#mock-forecaster")).toBeDefined();
    fireEvent.click(getByText("Clear Increase"));
  });

  describe("live region", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test("does not announce the load-time headline filled in by effects", () => {
      vi.useFakeTimers();
      const { getByRole } = customRender(<ForecastContainer />);
      const region = getByRole("status");
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(region.textContent).toBe("");
    });

    test("announces the projected 10-year total after the user changes an input", () => {
      vi.useFakeTimers();
      const { getByRole, getByText } = customRender(<ForecastContainer />);
      const region = getByRole("status");
      fireEvent.click(getByText("Change Rate"));
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(region.textContent).toMatch(/^Projected 10-year total £[\d,]+$/);
    });
  });
});
