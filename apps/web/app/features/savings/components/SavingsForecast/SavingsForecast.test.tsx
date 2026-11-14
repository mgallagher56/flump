import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", async () => {
  const actual: any = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

import {
  FORECAST_PROMPT,
  forecastOutcomeText,
  SavingsForecast,
  type SavingsForecastValues,
} from "./SavingsForecast";

const filled: SavingsForecastValues = {
  monthly: 300,
  rate: 4,
  years: 5,
  todaysMoney: false,
  goal: null,
};

const Harness = ({ initial }: { initial: SavingsForecastValues }) => {
  const [values, setValues] = useState(initial);
  return (
    <SavingsForecast
      startYear={2026}
      startingBalance={21000}
      values={values}
      onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
    />
  );
};

describe("SavingsForecast", () => {
  it("shows one outcome with two supporting figures and a chart", () => {
    render(<Harness initial={filled} />);
    const outcome = screen.getByTestId("savings-forecast-outcome");
    expect(outcome.textContent).toContain("Estimated balance in 5 years");
    expect(outcome.textContent).toContain("You pay in");
    expect(outcome.textContent).toContain("£18,000");
    expect(outcome.textContent).toContain("Interest");
    expect(screen.queryByText(FORECAST_PROMPT)).toBeNull();
  });

  it("draws no chart and no outcome when nothing is paid in and there is no rate", () => {
    render(<Harness initial={{ ...filled, monthly: null, rate: null }} />);
    expect(screen.queryByTestId("savings-forecast-outcome")).toBeNull();
    expect(screen.getByText(FORECAST_PROMPT)).toBeDefined();
  });

  it("updates the outcome when the years change", () => {
    render(<Harness initial={filled} />);
    fireEvent.change(screen.getByLabelText("Years ahead range slider"), {
      target: { value: "10" },
    });
    expect(screen.getByTestId("savings-forecast-outcome").textContent).toContain(
      "Estimated balance in 10 years",
    );
  });

  it("shows the time to a goal from More options", () => {
    render(<Harness initial={{ ...filled, goal: 30000 }} />);
    expect(screen.getByTestId("savings-forecast-goal").textContent).toMatch(
      /^Estimated time to reach your goal: /,
    );
  });

  it("builds the announcement text", () => {
    expect(forecastOutcomeText(filled, 21000)).toMatch(/^About £[\d,]+ in 5 years$/);
    expect(forecastOutcomeText({ ...filled, monthly: null, rate: null }, 21000)).toBe(
      FORECAST_PROMPT,
    );
  });
});
