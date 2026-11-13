import { fireEvent, render, screen } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { type PensionScenario, usePensionScenario } from "../../usePensionScenario";
import { ForecastAssumptions } from "./ForecastAssumptions";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({ formatCurrency: (v: number) => `£${Math.round(v)}` }),
}));

let current: PensionScenario;
const Harness: FC = () => {
  current = usePensionScenario(5);
  return (
    <ForecastAssumptions
      isSalarySacrifice
      passEmployerNi={false}
      scenario={current}
      statePensionMonthly={958}
    />
  );
};

describe("<ForecastAssumptions />", () => {
  it("toggles the three scenario rules", () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText(/Qualifying earnings only/));
    fireEvent.click(screen.getByLabelText(/today's money/));
    fireEvent.click(screen.getByLabelText(/full new State Pension/));
    expect(current.values).toMatchObject({
      useQualifyingEarnings: true,
      adjustForInflation: true,
      includeStatePension: true,
    });
    expect(screen.getByText(/Adds £958 a month/)).toBeDefined();
  });

  it("shows salary sacrifice as a saved fact, not a control", () => {
    render(<Harness />);
    expect(screen.getByText(/Salary sacrifice: on \(from your details\)/)).toBeDefined();
    expect(screen.queryByLabelText(/Salary sacrifice/)).toBeNull();
  });
});
