import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

vi.mock("recharts", async () => {
  const actual: any = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

import { SavingsForecasterCard } from "./SavingsForecasterCard";

const setup = () =>
  render(
    <SavingsForecasterCard
      monthlyContribution={200}
      portfolioInterestRate={4.75}
      startingBalance={10000}
    />,
  );

describe("SavingsForecasterCard", () => {
  it("renders the forecast settings, projection and a stated assumption", () => {
    setup();

    expect(screen.getByText("Forecast settings")).toBeDefined();
    expect(screen.getByText("Interest rate")).toBeDefined();
    expect(screen.getByText("Years ahead")).toBeDefined();
    expect(screen.getByText("Savings projection")).toBeDefined();
    expect(screen.getByText(/Projection at 4\.8% a year over 15 years/)).toBeDefined();
    expect(screen.getByText("Milestones")).toBeDefined();
  });

  it("shows the milestone time and flags the ones already reached", () => {
    setup();
    expect(screen.getByText("Reached")).toBeDefined();
    expect(screen.getAllByText(/In about/).length).toBeGreaterThan(0);
  });

  it("adds a custom goal as the first milestone", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Your own goal"), { target: { value: "40000" } });
    expect(screen.getByText("Goal")).toBeDefined();
  });

  it("states the real-terms assumption when inflation is on", () => {
    setup();
    fireEvent.click(screen.getByLabelText(/Show in today's money/));
    expect(screen.getAllByText(/after inflation/).length).toBeGreaterThan(0);
  });
});

describe("SavingsForecasterCard chart accessibility", () => {
  it("exposes the projection as a named figure with the formatted headline", () => {
    setup();

    const figure = screen.getByRole("figure", { name: "Savings growth projection" });
    expect(figure.textContent).toMatch(/Projected savings balance after 15 years: £[\d,]+/);
  });
});
