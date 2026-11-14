import { fireEvent, render, screen } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { type PensionScenario, usePensionScenario } from "../../usePensionScenario";
import { ForecasterControls } from "./ForecasterControls";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({ formatCurrency: (v: number) => `£${Math.round(v)}` }),
}));

let current: PensionScenario;
const Harness: FC<{ portfolioReturnRate?: number }> = ({ portfolioReturnRate }) => {
  current = usePensionScenario(6);
  return <ForecasterControls portfolioReturnRate={portfolioReturnRate} scenario={current} />;
};

describe("<ForecasterControls />", () => {
  it("offers only scenario levers, no salary or contribution fields", () => {
    render(<Harness portfolioReturnRate={6} />);
    expect(screen.getByLabelText("Extra each month range slider")).toBeDefined();
    expect(screen.getByLabelText("Years to retirement range slider")).toBeDefined();
    expect(screen.getByLabelText("Growth a year range slider")).toBeDefined();
    expect(screen.queryByLabelText(/salary/i)).toBeNull();
    expect(screen.queryByLabelText(/employer contrib/i)).toBeNull();
  });

  it("moving a lever updates scenario state and notes the edit", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Extra each month range slider"), {
      target: { value: "150" },
    });
    expect(current.values.extraMonthly).toBe(150);
    expect(current.isModified).toBe(true);
    expect(screen.getByText(/Edited\. Not saved\./)).toBeDefined();
  });

  it("quick growth rates set the rate and mark the pressed one", () => {
    render(<Harness portfolioReturnRate={6} />);
    fireEvent.click(screen.getByRole("button", { name: "9%" }));
    expect(current.values.growthRate).toBe(9);
    expect(screen.getByRole("button", { name: "9%" }).getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Your pots (6%)" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("presses only one chip when your pots' rate matches a preset", () => {
    render(<Harness portfolioReturnRate={5} />);
    fireEvent.click(screen.getByRole("button", { name: "Your pots (5%)" }));
    expect(current.values.growthRate).toBe(5);
    const pressed = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed.map((b) => b.textContent)).toEqual(["Your pots (5%)"]);
    expect(screen.getByRole("button", { name: "5%" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("a cleared pill does not snap the value to 0", () => {
    render(<Harness />);
    const pill = screen.getByLabelText("Years to retirement input") as HTMLInputElement;
    fireEvent.focus(pill);
    fireEvent.change(pill, { target: { value: "" } });
    fireEvent.blur(pill);
    expect(current.values.horizonYears).toBe(25);
  });
});
