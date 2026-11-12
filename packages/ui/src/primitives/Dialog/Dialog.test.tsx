import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

const Harness = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button">outside</button>
      <Dialog open={open} onOpenChange={setOpen} title="T">
        <button type="button">inside</button>
      </Dialog>
    </>
  );
};

describe("Dialog primitive", () => {
  it("renders nothing while closed", () => {
    render(
      <Dialog open={false} onOpenChange={() => {}} title="Hello">
        body
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("exposes role=dialog, aria-modal and an accessible name and description", () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Add liability" description="Log a debt">
        <input aria-label="Name" />
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Add liability" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("closes on Escape", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="T">
        <button type="button">inner</button>
      </Dialog>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("close button has a label and requests close", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="T" closeLabel="Close settings">
        x
      </Dialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("moves focus into the dialog and traps it", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    // Focus guards are rendered by Radix's FocusScope (trapped) while open.
    expect(document.querySelectorAll("[data-radix-focus-guard]").length).toBeGreaterThan(0);
  });
});
