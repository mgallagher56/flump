import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { Tooltip, TooltipProvider } from "./Tooltip";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Tooltip", () => {
  it("shows on focus, describes the trigger and dismisses with Escape", async () => {
    render(
      <Tooltip label="Delete account">
        <button type="button" aria-label="Delete">
          x
        </button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    const trigger = screen.getByRole("button", { name: "Delete" });
    fireEvent.focus(trigger);
    const tip = await screen.findByRole("tooltip");
    expect(tip.textContent).toBe("Delete account");
    expect(trigger.getAttribute("aria-describedby")).toBeTruthy();
    fireEvent.keyDown(trigger, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("works under a TooltipProvider without a second provider", async () => {
    render(
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <Tooltip label="Help text" defaultOpen>
          <button type="button">?</button>
        </Tooltip>
      </TooltipProvider>,
    );
    expect((await screen.findByRole("tooltip")).textContent).toBe("Help text");
  });

  it("renders open when defaultOpen is set", async () => {
    render(
      <Tooltip label="Help" defaultOpen>
        <button type="button">?</button>
      </Tooltip>,
    );
    expect(await screen.findByRole("tooltip")).toBeDefined();
  });
});
