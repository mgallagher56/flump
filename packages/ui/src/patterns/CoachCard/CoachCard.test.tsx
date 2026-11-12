import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CoachCard } from "./CoachCard";

const actions = {
  primaryAction: <button type="button">Add your pension</button>,
  secondaryAction: <button type="button">Remind me later</button>,
};

describe("CoachCard Pattern", () => {
  it("is a region named by its heading", () => {
    render(<CoachCard {...actions} headingLevel="h2" title="Next best step" />);
    const region = screen.getByRole("region", { name: "Next best step" });
    expect(region).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Next best step" })).toBeDefined();
  });

  it("renders the requested heading level", () => {
    render(<CoachCard {...actions} headingLevel="h3" title="Next best step" />);
    expect(screen.getByRole("heading", { level: 3 })).toBeDefined();
  });

  it("renders eyebrow, description, icon and both actions", () => {
    render(
      <CoachCard
        {...actions}
        description="Your employer matches up to 5%."
        eyebrow="Suggested for you"
        headingLevel="h2"
        icon={<span>glyph</span>}
        title="Claim your employer match"
      />,
    );
    expect(screen.getByText("Suggested for you")).toBeDefined();
    expect(screen.getByText("Your employer matches up to 5%.")).toBeDefined();
    expect(screen.getByText("glyph").parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("button", { name: "Add your pension" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Remind me later" })).toBeDefined();
  });

  it("omits the dismiss button without onDismiss", () => {
    render(<CoachCard {...actions} headingLevel="h2" title="Next best step" />);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("fires onDismiss from a labelled type=button", () => {
    const onDismiss = vi.fn();
    render(
      <CoachCard {...actions} headingLevel="h2" onDismiss={onDismiss} title="Next best step" />,
    );
    const button = screen.getByRole("button", { name: "Dismiss" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("supports a custom dismiss label", () => {
    render(
      <CoachCard
        {...actions}
        dismissLabel="Hide this suggestion"
        headingLevel="h2"
        onDismiss={() => {}}
        title="Next best step"
      />,
    );
    expect(screen.getByRole("button", { name: "Hide this suggestion" })).toBeDefined();
  });

  it("keeps DOM (tab) order primary, secondary, dismiss with no positive tabindex", () => {
    const { container } = render(
      <CoachCard {...actions} headingLevel="h2" onDismiss={() => {}} title="Next best step" />,
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual([
      "Add your pension",
      "Remind me later",
      "Dismiss",
    ]);
    for (const b of buttons) expect(Number(b.getAttribute("tabindex") ?? 0)).toBeLessThanOrEqual(0);
  });

  it("pairs id and data-testid", () => {
    const { container } = render(
      <CoachCard {...actions} headingLevel="h2" id="pension-coach" title="Next best step" />,
    );
    expect(container.querySelector("#pension-coach")?.getAttribute("data-testid")).toBe(
      "pension-coach",
    );
  });
});
