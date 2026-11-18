import { figureKnown, figureUnknown, type MonthsOfCover } from "@flump/finance-engine";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreathingRoom } from "./BreathingRoom";

const known = (months: number, liquidCash: number) =>
  figureKnown<MonthsOfCover>({
    months,
    liquidCash,
    monthlyEssentials: 2800,
    commitments: {} as MonthsOfCover["commitments"],
  });

describe("BreathingRoom", () => {
  it("is its own section with the owner's title and description", () => {
    render(<BreathingRoom figure={known(1.5, 4200)} />);
    const section = screen.getByRole("region", { name: "Breathing room" });
    expect(
      within(section).getByText("How long your savings would cover the essentials."),
    ).toBeDefined();
    // Saved figures never sit inside a modelling zone.
    expect(section.closest('[data-testid="scenario-zone"]')).toBeNull();
  });

  it("shows the engine's figure in one result card, with the money to draw on", () => {
    const { container } = render(<BreathingRoom figure={known(1.5, 4200)} />);
    const cards = screen.getAllByRole("group", { name: "Breathing room" });
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("About 1.5 months");
    expect(container.querySelector('[data-figure="monthsOfCover"]')?.textContent).toBe(
      "1.5 months",
    );
    expect(screen.getByRole("term").textContent).toBe("Money to draw on");
    expect(screen.getByRole("definition").textContent).toBe("£4,200");
  });

  it("shows no scene of its own: the page icon is the budget page's one illustration", () => {
    const { container, rerender } = render(<BreathingRoom figure={known(1.5, 4200)} />);
    expect(container.querySelector("[data-scene]")).toBeNull();
    rerender(<BreathingRoom figure={figureUnknown(["budgetEssentials"], "not-set")} />);
    expect(container.querySelector("[data-scene]")).toBeNull();
  });

  it("says more than ten years rather than a large month count", () => {
    render(<BreathingRoom figure={known(130, 364000)} />);
    expect(screen.getByRole("group").textContent).toContain("More than 10 years");
  });

  it("prompts for essential spending when the figure is not known, with no zero", () => {
    const { container } = render(
      <BreathingRoom figure={figureUnknown(["budgetEssentials"], "not-set")} />,
    );
    expect(screen.getByText("Add your essential spending to see this.")).toBeDefined();
    expect(container.querySelector("[data-figure]")).toBeNull();
    expect(screen.queryByRole("term")).toBeNull();
  });

  it("keeps the detail behind the info tip", () => {
    render(<BreathingRoom figure={known(1.5, 4200)} />);
    expect(screen.getByRole("button", { name: "About Breathing room" })).toBeDefined();
    expect(screen.queryByText(/minimum debt payments/)).toBeNull();
  });
});
