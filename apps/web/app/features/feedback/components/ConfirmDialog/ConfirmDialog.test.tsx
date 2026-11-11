import { css } from "@repo/ui/styled-system/css";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

function setup(overrides: Partial<ConfirmDialogProps> = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Delete 2024?"
      description="This removes all monthly balances for 2024."
      confirmLabel="Delete year"
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onOpenChange, onConfirm };
}

describe("ConfirmDialog", () => {
  it("renders role alertdialog named by the title", () => {
    setup();
    expect(screen.getByRole("alertdialog", { name: "Delete 2024?" })).toBeDefined();
    expect(screen.getByText("This removes all monthly balances for 2024.")).toBeDefined();
  });

  it("focuses Cancel initially", () => {
    setup();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("Cancel and Escape call onOpenChange(false) and not onConfirm", () => {
    const { onOpenChange, onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm once from the confirm button", () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete year" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while pending", () => {
    setup({ pending: true });
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole("button", { name: "Delete year" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("requires matching text (case-insensitive) before confirming", () => {
    const { onConfirm } = setup({ requireText: "RESET", confirmLabel: "Reset" });
    const confirm = screen.getByRole("button", { name: "Reset" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "rese" } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "reset" } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  const dangerBg = css({ bg: "status.danger.solid" });
  const primaryBg = css({ bg: "primary" });

  it("uses Button's destructive variant for tone danger, with no competing background", () => {
    setup({ tone: "danger" });
    const button = screen.getByRole("button", { name: "Delete year" });
    expect(button.className).toContain(dangerBg);
    expect(button.className).not.toContain(primaryBg);
  });

  it("uses Button's primary variant otherwise", () => {
    setup();
    const button = screen.getByRole("button", { name: "Delete year" });
    expect(button.className).toContain(primaryBg);
    expect(button.className).not.toContain(dangerBg);
  });

  it("renders through a portal on document.body", () => {
    setup();
    expect(screen.getByRole("alertdialog").closest("body")).toBe(document.body);
    expect(document.body.querySelector('[role="alertdialog"]')?.parentElement).toBe(document.body);
  });
});
