import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CoachCard } from "./CoachCard";

const actions = {
  primaryAction: <button type="button">Add missing details</button>,
  secondaryAction: <button type="button">Not now</button>,
};

describe("CoachCard Pattern", () => {
  it("is a region named by its heading", () => {
    render(<CoachCard {...actions} headingLevel="h2" title="Finish setting up" />);
    const region = screen.getByRole("region", { name: "Finish setting up" });
    expect(region).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Finish setting up" })).toBeDefined();
  });

  it("renders the requested heading level", () => {
    render(<CoachCard {...actions} headingLevel="h3" title="Finish setting up" />);
    expect(screen.getByRole("heading", { level: 3 })).toBeDefined();
  });

  it("renders eyebrow, description, icon and both actions", () => {
    render(
      <CoachCard
        {...actions}
        description="Two details are missing."
        eyebrow="Housekeeping"
        headingLevel="h2"
        icon={<span>glyph</span>}
        title="Finish setting up your accounts"
      />,
    );
    expect(screen.getByText("Housekeeping")).toBeDefined();
    expect(screen.getByText("Two details are missing.")).toBeDefined();
    expect(screen.getByText("glyph").parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("button", { name: "Add missing details" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Not now" })).toBeDefined();
  });

  it("omits the dismiss button without onDismiss", () => {
    render(<CoachCard {...actions} headingLevel="h2" title="Finish setting up" />);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("fires onDismiss from a labelled type=button", () => {
    const onDismiss = vi.fn();
    render(
      <CoachCard {...actions} headingLevel="h2" onDismiss={onDismiss} title="Finish setting up" />,
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
        dismissLabel="Hide this reminder"
        headingLevel="h2"
        onDismiss={() => {}}
        title="Finish setting up"
      />,
    );
    expect(screen.getByRole("button", { name: "Hide this reminder" })).toBeDefined();
  });

  it("keeps DOM (tab) order primary, secondary, dismiss with no positive tabindex", () => {
    const { container } = render(
      <CoachCard {...actions} headingLevel="h2" onDismiss={() => {}} title="Finish setting up" />,
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual([
      "Add missing details",
      "Not now",
      "Dismiss",
    ]);
    for (const b of buttons) expect(Number(b.getAttribute("tabindex") ?? 0)).toBeLessThanOrEqual(0);
  });

  it("pairs id and data-testid", () => {
    const { container } = render(
      <CoachCard {...actions} headingLevel="h2" id="pension-coach" title="Finish setting up" />,
    );
    expect(container.querySelector("#pension-coach")?.getAttribute("data-testid")).toBe(
      "pension-coach",
    );
  });
});
