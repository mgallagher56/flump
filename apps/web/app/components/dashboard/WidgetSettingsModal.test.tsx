import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WidgetSettingsModal } from "./WidgetSettingsModal";

describe("WidgetSettingsModal", () => {
  it("renders nothing while closed", () => {
    render(
      <WidgetSettingsModal isOpen={false} onClose={vi.fn()} title="Tax settings">
        content
      </WidgetSettingsModal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a labelled modal dialog that closes on Escape, Done and the close button", () => {
    const onClose = vi.fn();
    render(
      <WidgetSettingsModal isOpen onClose={onClose} title="Tax settings" description="Customise it">
        <p>content</p>
      </WidgetSettingsModal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Tax settings" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
