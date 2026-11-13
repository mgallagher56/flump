import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";

const ReturnHarness = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Controls">
        <button type="button">inside</button>
      </Sheet>
    </>
  );
};

describe("Sheet primitive", () => {
  it("renders nothing while closed", () => {
    render(
      <Sheet open={false} onOpenChange={() => {}} title="Controls">
        x
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("exposes role=dialog, aria-modal, a name and a description", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="Adjust inputs" description="Changes apply live">
        <input aria-label="Rate" />
      </Sheet>,
    );
    const sheet = screen.getByRole("dialog", { name: "Adjust inputs" });
    expect(sheet.getAttribute("aria-modal")).toBe("true");
    const desc = document.getElementById(sheet.getAttribute("aria-describedby") as string);
    expect(desc?.textContent).toBe("Changes apply live");
  });

  it("omits aria-describedby without a description", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="Controls">
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog").hasAttribute("aria-describedby")).toBe(false);
  });

  it("keeps a hidden title in the accessibility tree", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="Controls" hideTitle>
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog", { name: "Controls" })).toBeDefined();
  });

  it("closes on Escape and via the labelled close button", () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange} title="Controls" closeLabel="Close controls">
        x
      </Sheet>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Close controls" }));
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it("traps focus inside and returns it to the opener", async () => {
    render(<ReturnHarness />);
    const opener = screen.getByRole("button", { name: "open" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    expect(document.querySelectorAll("[data-radix-focus-guard]").length).toBeGreaterThan(0);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("keeps the footer outside the scrolling body", () => {
    render(
      <Sheet
        open
        onOpenChange={() => {}}
        title="T"
        side="right"
        footer={<button type="button">Apply</button>}
      >
        <p>body</p>
      </Sheet>,
    );
    const body = screen.getByText("body").parentElement as HTMLElement;
    const apply = screen.getByRole("button", { name: "Apply" });
    expect(body.contains(apply)).toBe(false);
    expect(screen.getByRole("dialog").contains(apply)).toBe(true);
  });

  it("renders through a portal on document.body", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="T">
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog").parentElement).toBe(document.body);
  });
});
