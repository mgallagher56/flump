import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollapsibleDrawer } from "./CollapsibleDrawer";

describe("CollapsibleDrawer Primitive", () => {
  it("expands and collapses children when trigger button is clicked", () => {
    render(
      <CollapsibleDrawer subtitle="36-month amortisation schedule" title="Repayment Breakdown">
        <div>Schedule row item</div>
      </CollapsibleDrawer>,
    );

    const trigger = screen.getByRole("button", { name: /repayment breakdown/i });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Schedule row item")).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Schedule row item")).toBeDefined();
  });

  it("is collapsed by default and controls the body by id", () => {
    render(
      <CollapsibleDrawer title="Schedule">
        <div>Body</div>
      </CollapsibleDrawer>,
    );
    const trigger = screen.getByRole("button");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    const controls = trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls as string)?.textContent).toBe("Body");
  });

  it("shows an en-GB item count with singular and plural nouns", () => {
    const { rerender } = render(
      <CollapsibleDrawer itemCount={1200} title="Schedule">
        <div>Body</div>
      </CollapsibleDrawer>,
    );
    expect(screen.getByText("1,200 rows")).toBeDefined();
    rerender(
      <CollapsibleDrawer itemCount={1} itemNoun={{ one: "year", other: "years" }} title="Schedule">
        <div>Body</div>
      </CollapsibleDrawer>,
    );
    expect(screen.getByText("1 year")).toBeDefined();
  });

  it("animates the body only under motion-safe", () => {
    render(
      <CollapsibleDrawer defaultOpen title="Schedule">
        <div>Body</div>
      </CollapsibleDrawer>,
    );
    const body = screen.getByText("Body").parentElement as HTMLElement;
    expect(body.className).toContain("motionSafe:");
  });
});
