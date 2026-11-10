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
});
