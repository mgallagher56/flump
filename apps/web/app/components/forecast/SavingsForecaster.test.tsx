import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import SavingsForecaster from "./SavingsForecaster";

// Mock Recharts ResponsiveContainer to render children
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 400, height: 400 }}>{children}</div>
    ),
  };
});

describe("<SavingsForecaster />", () => {
  test("renders correctly with parameter values", () => {
    const { container, getByText } = customRender(
      <SavingsForecaster
        currentSavingRate={250}
        hypotheticalSavingRate={500}
        startingBalance={10000}
        onCurrentRateChange={vi.fn()}
        onHypotheticalRateChange={vi.fn()}
        onStartingBalanceChange={vi.fn()}
      />,
    );

    expect(container).toBeDefined();
    // Validate that starting balance and monthly rates are displayed in controls
    expect(getByText("£10,000")).toBeDefined();
    expect(getByText("£250/mo")).toBeDefined();
    expect(getByText("£500/mo")).toBeDefined();
  });
});
