import { findFigures } from "@repo/ui/testing";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForecastAssumptions, type ForecastAssumptionsProps } from "./ForecastAssumptions";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (v: number) => `£${Math.round(v).toLocaleString("en-GB")}`,
  }),
}));

const props: ForecastAssumptionsProps = {
  employerAndGrowth: 438817,
  totalGrowth: 300000,
  annualPaidIn: 6380,
  statePensionAnnual: 12547,
  growthRateIsPlaceholder: false,
  placeholderGrowthRate: 5,
  methodSet: true,
  isSalarySacrifice: false,
  passEmployerNi: false,
};

describe("<ForecastAssumptions />", () => {
  it("is closed by default, so none of its figures show", () => {
    render(<ForecastAssumptions {...props} />);
    expect(screen.getByRole("button", { name: "Assumptions and UK rules" })).toBeDefined();
    expect(screen.queryByTestId("pension-assumptions")).toBeNull();
  });

  it("opens to a short list with at most one figure per sentence", () => {
    render(<ForecastAssumptions {...props} growthRateIsPlaceholder />);
    fireEvent.click(screen.getByRole("button", { name: "Assumptions and UK rules" }));
    const list = screen.getByTestId("pension-assumptions");
    expect(list.textContent).toContain("£438,817");
    expect(list.textContent).toContain("assumes 5% a year");
    for (const item of Array.from(list.querySelectorAll("li"))) {
      for (const sentence of (item.textContent ?? "").split(/(?<=\.)\s+/)) {
        const el = document.createElement("p");
        el.textContent = sentence;
        expect(findFigures(el).length, sentence).toBeLessThanOrEqual(1);
      }
    }
  });
});
