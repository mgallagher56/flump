import { fireEvent, render, screen } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { usePensionScenario } from "../../usePensionScenario";
import { PensionForecast, type PensionForecastProps } from "./PensionForecast";

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (v: number) => `£${Math.round(v).toLocaleString("en-GB")}`,
  }),
}));
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

const facts: Omit<PensionForecastProps, "scenario"> = {
  hasSalary: true,
  salary: 50000,
  employeePercent: 6,
  employerPercent: 4,
  isSalarySacrifice: true,
  passEmployerNi: false,
  currentPotTotal: 30000,
  directMonthlyContrib: 100,
  portfolioReturnRate: 5.4,
  growthRateIsPlaceholder: false,
  hasPots: true,
};

const Harness: FC<Partial<typeof facts>> = (over) => {
  const scenario = usePensionScenario(5.4);
  return <PensionForecast {...facts} {...over} scenario={scenario} onEditDetails={vi.fn()} />;
};

describe("<PensionForecast />", () => {
  it("is one scenario zone with the basis line from saved facts", () => {
    render(<Harness />);
    expect(screen.getAllByRole("region", { name: "Model a change to your pension" })).toHaveLength(
      1,
    );
    expect(
      screen.getByText("Starting from your figures: £50,000 salary, 6% you and 4% your employer"),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /Reset to saved figures/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sync/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Apply/i })).toBeNull();
  });

  it("moving a lever shows Reset, and Reset restores the saved figures", () => {
    render(<Harness />);
    const extra = screen.getByLabelText("Extra each month range slider") as HTMLInputElement;
    fireEvent.change(extra, { target: { value: "200" } });
    expect(extra.value).toBe("200");
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect((screen.getByLabelText("Extra each month range slider") as HTMLInputElement).value).toBe(
      "0",
    );
    expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
  });

  it("no salary shows the prompt and no projection", () => {
    render(<Harness hasSalary={false} salary={0} />);
    expect(screen.getByText(/Add your salary in/).textContent).toContain(
      "to project your pension.",
    );
    expect(screen.queryByLabelText("Extra each month range slider")).toBeNull();
  });
});
