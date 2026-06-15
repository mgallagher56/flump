import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import ForecastContainer from "./ForecastContainer";

// Mock child components to keep this integration/container test simple
vi.mock("app/components/forecast/SavingsForecaster", () => ({
  default: () => <div id="mock-forecaster">Mock Savings Forecaster</div>,
}));

vi.mock("app/components/forecast/UKTaxCalculator", () => ({
  default: () => <div id="mock-calculator">Mock UK Tax Calculator</div>,
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(() => ({
      accounts: [{ id: "1", name: "Main checking", type: "Current", balance: 5000 }],
      accountDetails: [{ account_id: "1", month: 12, year: 2023, value: 5000 }],
    })),
  };
});

describe("<ForecastContainer />", () => {
  test("renders correctly and allows tab switching", () => {
    const { container, getByText, queryByText } = customRender(<ForecastContainer />);
    expect(container).toBeDefined();

    // Verify title and initial active tab (Savings Forecaster)
    expect(getByText("Forecast & Tools")).toBeDefined();
    expect(container.querySelector("#mock-forecaster")).toBeDefined();
    expect(container.querySelector("#mock-calculator")).toBeNull();

    // Click on UK Take-Home Pay Calculator tab
    const calcTabBtn = getByText("UK Take-Home Pay Calculator");
    fireEvent.click(calcTabBtn);

    // Verify view switch
    expect(container.querySelector("#mock-calculator")).toBeDefined();
    expect(container.querySelector("#mock-forecaster")).toBeNull();
  });
});
