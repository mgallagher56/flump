import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stepper } from "./Stepper";

const steps = [
  { id: "you", label: "You and income" },
  { id: "home", label: "Housing and outgoings" },
  { id: "save", label: "Savings and debt" },
];

describe("Stepper", () => {
  it("marks only the current step with aria-current=step", () => {
    render(<Stepper current={2} steps={steps} />);
    const list = screen.getByRole("list", { name: "Setup progress" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]?.hasAttribute("aria-current")).toBe(false);
    expect(items[1]?.getAttribute("aria-current")).toBe("step");
    expect(items[2]?.hasAttribute("aria-current")).toBe(false);
  });

  it("states each step in words, not colour alone", () => {
    render(<Stepper current={2} steps={steps} />);
    expect(screen.getByText("Complete")).toBeDefined();
    expect(screen.getByText("Current step")).toBeDefined();
    expect(screen.getByText("Up next")).toBeDefined();
  });

  it("gives screen readers the position of each step", () => {
    render(<Stepper current={1} steps={steps} />);
    expect(screen.getByText("Step 3 of 3:")).toBeDefined();
  });

  it("shows a compact 'Step 2 of 3' summary for phones", () => {
    render(<Stepper current={2} steps={steps} />);
    const summary = screen.getByTestId("stepper-summary");
    expect(within(summary).getByText("Step 2 of 3")).toBeDefined();
    expect(within(summary).getByText("Housing and outgoings")).toBeDefined();
  });

  it("clamps an out-of-range current step and accepts a custom label", () => {
    render(<Stepper current={9} label="Onboarding" steps={steps} />);
    const list = screen.getByRole("list", { name: "Onboarding" });
    expect(within(list).getAllByRole("listitem")[2]?.getAttribute("aria-current")).toBe("step");
  });

  it("keeps the default states when no overrides are given", () => {
    render(<Stepper current={3} steps={steps} />);
    expect(screen.getAllByText("Complete")).toHaveLength(2);
    expect(screen.queryByText("Skipped")).toBeNull();
  });

  it("applies per-step overrides and never overrides the current step", () => {
    render(
      <Stepper
        current={2}
        states={{ you: "skipped", home: "complete", save: "complete" }}
        steps={steps}
      />,
    );
    const list = screen.getByRole("list", { name: "Setup progress" });
    const items = within(list).getAllByRole("listitem");
    expect(items[0]?.getAttribute("data-state")).toBe("skipped");
    expect(within(items[0] as HTMLElement).getByText("Skipped")).toBeDefined();
    expect(items[1]?.getAttribute("aria-current")).toBe("step");
    expect(within(items[1] as HTMLElement).getByText("Current step")).toBeDefined();
    expect(items[2]?.getAttribute("data-state")).toBe("complete");
    expect(within(items[2] as HTMLElement).getByText("Complete")).toBeDefined();
  });

  it("can mark an earlier step upcoming instead of complete", () => {
    render(<Stepper current={3} states={{ home: "upcoming" }} steps={steps} />);
    expect(screen.getAllByText("Complete")).toHaveLength(1);
    expect(screen.getByText("Up next")).toBeDefined();
  });
});
