import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultBlock } from "./ResultBlock";

describe("ResultBlock", () => {
  it("is a group named by its label, with the lead-in before the figure", () => {
    render(
      <ResultBlock
        figure="1.5 months"
        label="Breathing room"
        leadIn="About"
        note="How long your savings would cover the essentials."
      />,
    );
    const group = screen.getByRole("group", { name: "Breathing room" });
    expect(group.textContent).toContain("About 1.5 months");
    expect(screen.getByText("How long your savings would cover the essentials.")).toBeDefined();
  });

  it("sets the figure in numeric.result with tabular numerals on a plain card", () => {
    const { container } = render(<ResultBlock figure="£388,000" label="Pot at 67" />);
    const figure = container.querySelector('[data-slot="figure"]') as HTMLElement;
    expect(figure.className).toContain("numeric.result");
    const root = screen.getByRole("group");
    expect(root.className).toContain("surface.card");
    expect(root.className).not.toContain("surface.hero");
    expect(root.className).not.toContain("tint");
    expect(root.className).not.toContain("accent");
  });

  it("shows one supporting row as a term and its value", () => {
    render(
      <ResultBlock
        figure="1.5 months"
        label="Breathing room"
        row={{ label: "Money to draw on", value: "£4,200" }}
      />,
    );
    expect(screen.getByRole("term").textContent).toBe("Money to draw on");
    expect(screen.getByRole("definition").textContent).toBe("£4,200");
  });

  it("shows the prompt, never a zero, when the figure is not known", () => {
    const { container, rerender } = render(<ResultBlock figure={null} label="Breathing room" />);
    expect(container.querySelector('[data-slot="figure"]')).toBeNull();
    expect(container.querySelector('[data-slot="empty"]')?.textContent).toBe("Not set");
    expect(screen.getByRole("group").dataset.known).toBe("false");
    rerender(
      <ResultBlock
        emptyPrompt="Add your essential spending"
        figure={null}
        label="Breathing room"
      />,
    );
    expect(screen.getByText("Add your essential spending")).toBeDefined();
  });

  it("pairs id and data-testid and renders the label addon", () => {
    render(
      <ResultBlock
        figure="1.5 months"
        id="breathing-room-result"
        label="Breathing room"
        labelAddon={<button type="button">About breathing room</button>}
      />,
    );
    expect(screen.getByTestId("breathing-room-result").id).toBe("breathing-room-result");
    expect(screen.getByRole("button", { name: "About breathing room" })).toBeDefined();
  });

  it("can hide the label and still be named by it", () => {
    render(<ResultBlock figure="1.5 months" hideLabel label="Breathing room" leadIn="About" />);
    const group = screen.getByRole("group", { name: "Breathing room" });
    expect(group.querySelector('[class*="label.md"]')).toBeNull();
  });
});
