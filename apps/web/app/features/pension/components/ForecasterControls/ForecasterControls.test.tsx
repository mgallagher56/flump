import { fireEvent, render, screen } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { type PensionScenario, usePensionScenario } from "../../usePensionScenario";
import { ForecasterControls } from "./ForecasterControls";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({ formatCurrency: (v: number) => `£${Math.round(v)}` }),
}));

let current: PensionScenario;
const Harness: FC<{ age: number | null }> = ({ age }) => {
  current = usePensionScenario({ contributionPercent: 8, horizonYears: 32, growthRate: 6 });
  return <ForecasterControls currentAge={age} scenario={current} statePensionMonthly={1000} />;
};

const slider = (label: string) =>
  screen.getByLabelText(`${label} range slider`) as HTMLInputElement;

describe("<ForecasterControls />", () => {
  it("shows three inputs, with the UK rule options behind More options", () => {
    render(<Harness age={35} />);
    expect(screen.getAllByRole("slider")).toHaveLength(3);
    expect(slider("Your contribution").value).toBe("8");
    expect(slider("Retirement age").value).toBe("67");
    expect(slider("Growth a year").value).toBe("6");
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByLabelText(/salary before tax/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /%/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("moving the retirement age changes the years in the scenario and notes the edit", () => {
    render(<Harness age={35} />);
    fireEvent.change(slider("Retirement age"), { target: { value: "60" } });
    expect(current.values.horizonYears).toBe(25);
    fireEvent.change(slider("Your contribution"), { target: { value: "10" } });
    expect(current.values.contributionPercent).toBe(10);
    expect(screen.getAllByText("Edited. Not saved.")).toHaveLength(2);
  });

  it("without a saved age, the time input is years until you retire", () => {
    render(<Harness age={null} />);
    expect(slider("Years until you retire").value).toBe("32");
    expect(screen.queryByLabelText("Retirement age range slider")).toBeNull();
  });
});
