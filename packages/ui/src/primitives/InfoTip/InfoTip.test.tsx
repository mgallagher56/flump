import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { InfoTip } from "./InfoTip";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("InfoTip", () => {
  it("is a named button that opens a glossary popover on click", async () => {
    render(<InfoTip term="Personal Allowance">The amount you can earn tax free.</InfoTip>);
    const trigger = screen.getByRole("button", { name: "About Personal Allowance" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Personal Allowance" });
    expect(dialog.textContent).toContain("The amount you can earn tax free.");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps aria-controls valid when a custom id is given", async () => {
    render(
      <InfoTip term="NI" id="ni-body">
        National Insurance.
      </InfoTip>,
    );
    const trigger = screen.getByRole("button", { name: "About NI" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "NI" });
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
  });

  it("closes with Escape", async () => {
    render(<InfoTip term="ISA">A tax-free savings wrapper.</InfoTip>);
    fireEvent.click(screen.getByRole("button", { name: "About ISA" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("accepts a custom accessible label", () => {
    render(
      <InfoTip term="APR" label="What does APR mean?">
        Annual percentage rate.
      </InfoTip>,
    );
    expect(screen.getByRole("button", { name: "What does APR mean?" })).toBeDefined();
  });
});
