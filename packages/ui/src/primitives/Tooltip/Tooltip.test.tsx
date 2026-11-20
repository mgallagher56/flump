import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
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

describe("Tooltip under a provider", () => {
  it("opens on hover after the provider's delay, not the 300ms default", () => {
    vi.useFakeTimers();
    try {
      render(
        <TooltipProvider delayDuration={50}>
          <Tooltip label="Help text">
            <button type="button">?</button>
          </Tooltip>
        </TooltipProvider>,
      );
      fireEvent.pointerMove(screen.getByRole("button", { name: "?" }), { pointerType: "mouse" });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.queryByRole("tooltip")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("puts its id on the content as data-testid", async () => {
    render(
      <Tooltip defaultOpen id="help-tip" label="Help">
        <button type="button">?</button>
      </Tooltip>,
    );
    await screen.findByRole("tooltip");
    expect(document.querySelector("[data-testid='help-tip']")).not.toBeNull();
  });
});
