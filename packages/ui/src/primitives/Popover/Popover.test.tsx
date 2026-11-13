import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Popover } from "./Popover";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Popover", () => {
  it("opens from the trigger and exposes a labelled dialog", async () => {
    render(
      <Popover title="Pay schedule" trigger={<button type="button">Details</button>}>
        Paid on the last working day.
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Pay schedule" });
    expect(dialog.textContent).toContain("Paid on the last working day.");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
  });

  it("keeps aria-controls valid when a custom id is given", async () => {
    render(
      <Popover id="custom-body" title="Notes" trigger={<button type="button">Open</button>}>
        Body
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Notes" });
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
    expect(document.getElementById("custom-body")?.textContent).toBe("Body");
  });

  it("renders the title as the requested element", async () => {
    render(
      <Popover
        title="Notes"
        titleAs="div"
        defaultOpen
        trigger={<button type="button">Open</button>}
      >
        Body
      </Popover>,
    );
    await screen.findByRole("dialog", { name: "Notes" });
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("closes with the close button", async () => {
    const onOpenChange = vi.fn();
    render(
      <Popover
        title="Notes"
        defaultOpen
        onOpenChange={onOpenChange}
        closeLabel="Close notes"
        trigger={<button type="button">Open</button>}
      >
        Body
      </Popover>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Close notes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes on Escape", async () => {
    render(
      <Popover title="Notes" defaultOpen trigger={<button type="button">Open</button>}>
        Body
      </Popover>,
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("uses aria-label when there is no title and can hide the close button", async () => {
    render(
      <Popover
        aria-label="Quick help"
        showClose={false}
        defaultOpen
        trigger={<button type="button">Open</button>}
      >
        Body
      </Popover>,
    );
    expect(await screen.findByRole("dialog", { name: "Quick help" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});
