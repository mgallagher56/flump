import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardWidgetKey } from "~/utils/pageConfig";
import { moveSection } from "../../sectionOrder";
import {
  ORDER_RULE,
  SECTION_COPY,
  WidgetVisibilityPanel,
  type WidgetVisibilityPanelProps,
} from "./WidgetVisibilityPanel";

const base = (over: Partial<WidgetVisibilityPanelProps> = {}): WidgetVisibilityPanelProps => ({
  open: true,
  onOpenChange: vi.fn(),
  widgetKeys: ["accounts", "budget", "debt"],
  visibleKeys: ["accounts", "budget"],
  onToggle: vi.fn(),
  error: null,
  ...over,
});

/** A page button that opens the panel, as the dashboard header does. */
function Opener() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button id="opener" type="button" onClick={() => setOpen(true)}>
        Choose what shows here
      </button>
      <WidgetVisibilityPanel
        {...base({ open, onOpenChange: setOpen })}
        returnFocusTo={() => document.getElementById("opener")}
      />
    </>
  );
}

describe("<WidgetVisibilityPanel />", () => {
  it("lists each widget as a checkbox reflecting its visibility", () => {
    render(<WidgetVisibilityPanel {...base()} />);
    expect(screen.getByRole("dialog", { name: "Choose what shows here" })).toBeDefined();
    const accounts = screen.getByRole("checkbox", { name: /^Accounts/ });
    const debt = screen.getByRole("checkbox", { name: /^Cards and loans/ });
    expect((accounts as HTMLInputElement).checked).toBe(true);
    expect((debt as HTMLInputElement).checked).toBe(false);
  });

  it("reports the toggled key", () => {
    const onToggle = vi.fn();
    render(<WidgetVisibilityPanel {...base({ onToggle })} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Cards and loans/ }));
    expect(onToggle).toHaveBeenCalledWith("debt");
  });

  it("says the rule once and has no jargon in the descriptions", () => {
    render(<WidgetVisibilityPanel {...base()} />);
    expect(
      screen.getAllByText(
        "Choose which sections show on your dashboard. They appear in this order.",
      ),
    ).toHaveLength(1);
    for (const { label, description } of Object.values(SECTION_COPY)) {
      expect(`${label} ${description}`).not.toMatch(/AER|salary sacrifice|0% deal/);
    }
  });

  it("says which ticked sections show on the dashboard", () => {
    render(
      <WidgetVisibilityPanel
        {...base({
          widgetKeys: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
          visibleKeys: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
          shownKeys: ["debt", "savings", "pension", "mortgage"],
        })}
      />,
    );
    expect(screen.getByTestId("widget-visibility-debt-status").textContent).toBe("Showing");
    expect(screen.getByTestId("widget-visibility-accounts-status").textContent).toBe("Not showing");
    expect(screen.getAllByText("Showing")).toHaveLength(4);
    expect(screen.getAllByText("Not showing")).toHaveLength(2);
  });

  it("allows selecting all sections when no cap is set", () => {
    render(
      <WidgetVisibilityPanel
        {...base({
          widgetKeys: ["accounts", "budget", "debt", "savings", "pension"],
          visibleKeys: ["accounts", "budget", "debt", "savings"],
        })}
      />,
    );
    const pension = screen.getByRole("checkbox", { name: /^Pension/ }) as HTMLInputElement;
    expect(pension.disabled).toBe(false);
    expect(
      (screen.getByRole("checkbox", { name: /^Cards and loans/ }) as HTMLInputElement).disabled,
    ).toBe(false);
  });

  it("disables nothing below the cap", () => {
    render(<WidgetVisibilityPanel {...base()} />);
    expect(
      (screen.getByRole("checkbox", { name: /^Cards and loans/ }) as HTMLInputElement).disabled,
    ).toBe(false);
  });

  it("shows a save error inline", () => {
    render(<WidgetVisibilityPanel {...base({ error: "Could not save." })} />);
    expect(screen.getByRole("alert").textContent).toContain("Could not save.");
  });

  it("closes from the Done button", () => {
    const onOpenChange = vi.fn();
    render(<WidgetVisibilityPanel {...base({ onOpenChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("has a close button (P10)", () => {
    const onOpenChange = vi.fn();
    render(<WidgetVisibilityPanel {...base({ onOpenChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("returns focus to the button that opened it when it closes (P10)", async () => {
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Choose what shows here" });
    // A tap that does not focus the button (Safari): focus is on the page when the sheet opens.
    fireEvent.click(opener);
    expect(await screen.findByRole("dialog")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

/** The panel with a working order, as the dashboard drives it. */
function Reorderable({ initial }: { initial: DashboardWidgetKey[] }) {
  const [order, setOrder] = useState(initial);
  return (
    <WidgetVisibilityPanel
      {...base({
        widgetKeys: order,
        visibleKeys: order,
        orderIsDefault: order.join() === initial.join(),
      })}
      onMove={(key, offset) => setOrder((o) => moveSection(o, key, offset))}
      onResetOrder={() => setOrder(initial)}
    />
  );
}

describe("<WidgetVisibilityPanel /> order", () => {
  const rowIds = () =>
    screen.getAllByRole("checkbox").map((box) => box.id.replace(/^widget-visibility-/, ""));

  it("says how to change the order when the order can be changed", () => {
    render(<WidgetVisibilityPanel {...base()} onMove={vi.fn()} onResetOrder={vi.fn()} />);
    expect(screen.getAllByText(ORDER_RULE)).toHaveLength(1);
  });

  it("has no order controls when the order cannot be changed", () => {
    render(<WidgetVisibilityPanel {...base()} />);
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset to default order" })).toBeNull();
  });

  it("gives each row a move up and a move down button, named after the section", () => {
    const onMove = vi.fn();
    render(<WidgetVisibilityPanel {...base()} onMove={onMove} onResetOrder={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Move Budget up" }));
    expect(onMove).toHaveBeenCalledWith("budget", -1);
    fireEvent.click(screen.getByRole("button", { name: "Move Budget down" }));
    expect(onMove).toHaveBeenCalledWith("budget", 1);
  });

  it("keeps the end buttons focusable but inert", () => {
    const onMove = vi.fn();
    render(<WidgetVisibilityPanel {...base()} onMove={onMove} onResetOrder={vi.fn()} />);
    const firstUp = screen.getByRole("button", { name: "Move Accounts up" });
    const lastDown = screen.getByRole("button", { name: "Move Cards and loans down" });
    expect(firstUp.getAttribute("aria-disabled")).toBe("true");
    expect(lastDown.getAttribute("aria-disabled")).toBe("true");
    expect((firstUp as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(firstUp);
    fireEvent.click(lastDown);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("moves a row, keeps focus on its button and says where it went", async () => {
    render(<Reorderable initial={["accounts", "budget", "debt"]} />);
    const down = screen.getByRole("button", { name: "Move Accounts down" });
    down.focus();
    fireEvent.click(down);
    expect(rowIds()).toEqual(["budget", "accounts", "debt"]);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Move Accounts down" }),
      ),
    );
    expect(screen.getByTestId("widget-order-status").textContent).toBe(
      "Accounts moved to position 2 of 3.",
    );
    expect(screen.getByTestId("widget-order-status").getAttribute("aria-live")).toBe("polite");
  });

  it("puts the default order back", async () => {
    render(<Reorderable initial={["accounts", "budget", "debt"]} />);
    const reset = screen.getByRole("button", { name: "Reset to default order" });
    expect(reset.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Move Cards and loans up" }));
    expect(rowIds()).toEqual(["accounts", "debt", "budget"]);
    expect(reset.getAttribute("aria-disabled")).toBe("false");
    fireEvent.click(reset);
    expect(rowIds()).toEqual(["accounts", "budget", "debt"]);
    expect(screen.getByTestId("widget-order-status").textContent).toBe(
      "Sections are back in the default order.",
    );
  });
});
