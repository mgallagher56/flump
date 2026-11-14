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
    // Nothing to point at while collapsed.
    expect(trigger.getAttribute("aria-controls")).toBeNull();
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

  describe("quiet variant", () => {
    it("is a text button named by the title, without the card trailing text", () => {
      render(
        <CollapsibleDrawer
          closedLabel="View full schedule"
          subtitle="Not shown"
          title="Show data"
          variant="quiet"
        >
          <div>Body</div>
        </CollapsibleDrawer>,
      );
      const trigger = screen.getByRole("button", { name: "Show data" });
      expect(trigger.textContent).toBe("Show data");
      expect(screen.queryByText("Not shown")).toBeNull();
      expect(screen.queryByText("View full schedule")).toBeNull();
    });

    it("toggles the body and reads Hide while open", () => {
      render(
        <CollapsibleDrawer title="Show details" variant="quiet">
          <div>Detail row</div>
        </CollapsibleDrawer>,
      );
      const trigger = screen.getByRole("button", { name: "Show details" });
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(trigger.getAttribute("aria-controls")).toBeNull();
      fireEvent.click(trigger);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      const body = screen.getByText("Detail row").parentElement as HTMLElement;
      expect(trigger.getAttribute("aria-controls")).toBe(body.id);
      // The visible label (and so the name) switches; aria-expanded still carries the state.
      expect(trigger.textContent).toBe("Hide details");
      expect(screen.getByRole("button", { name: "Hide details" })).toBe(trigger);
      fireEvent.click(trigger);
      expect(screen.queryByText("Detail row")).toBeNull();
      expect(trigger.textContent).toBe("Show details");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });

    it("uses openLabel while open, and keeps a title that does not start with Show", () => {
      const { unmount } = render(
        <CollapsibleDrawer openLabel="Close the table" title="Show data" variant="quiet">
          <div>Body</div>
        </CollapsibleDrawer>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Show data" }));
      expect(screen.getByRole("button", { name: "Close the table" })).toBeDefined();
      unmount();
      render(
        <CollapsibleDrawer title="How this is worked out" variant="quiet">
          <div>Body</div>
        </CollapsibleDrawer>,
      );
      const trigger = screen.getByRole("button", { name: "How this is worked out" });
      fireEvent.click(trigger);
      expect(trigger.textContent).toBe("How this is worked out");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    });

    it("shows the item count on the trigger", () => {
      render(
        <CollapsibleDrawer itemCount={12} title="Show data" variant="quiet">
          <div>Body</div>
        </CollapsibleDrawer>,
      );
      expect(screen.getByText("12 rows")).toBeDefined();
    });
  });
});
