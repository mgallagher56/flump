import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { css } from "../../../styled-system/css";
import { CONFIRM_ARMING_DELAY_MS, ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

// The single-item arming delay is measured with Date.now: fake the clock so a test can step past it.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});
/** Steps past the arming delay after opening. */
const arm = () => vi.setSystemTime(Date.now() + CONFIRM_ARMING_DELAY_MS + 1);

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
      scope="single"
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

  it("is labelled by its title and described by its description", () => {
    setup();
    const dialog = screen.getByRole("alertdialog");
    const labelId = dialog.getAttribute("aria-labelledby") as string;
    const descId = dialog.getAttribute("aria-describedby") as string;
    expect(document.getElementById(labelId)?.textContent).toBe("Delete 2024?");
    expect(document.getElementById(descId)?.textContent).toBe(
      "This removes all monthly balances for 2024.",
    );
  });

  it("marks the confirm button busy and swaps its copy while pending", () => {
    setup({ pending: true, pendingLabel: "Deleting" });
    const confirm = screen.getByRole("button", { name: "Deleting" });
    expect(confirm.getAttribute("aria-busy")).toBe("true");
  });

  it("does not close on Escape while pending", () => {
    const { onOpenChange } = setup({ pending: true });
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows a failure as an inline alert and keeps the dialog open", () => {
    setup({ error: "We couldn't reach the server. Please try again." });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("We couldn't reach the server. Please try again.");
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });

  it("renders no alert without an error", () => {
    setup();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("focuses the confirm button initially, so the focus ring shows what Enter does", () => {
    setup();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete year" }));
  });

  it("focuses Cancel initially when the dialog needs typed text", () => {
    setup({ requireText: "DELETE", confirmLabel: "Delete" });
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

  it("returns focus to the element that opened it when closed", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const props: ConfirmDialogProps = {
      scope: "single",
      open: true,
      onOpenChange: vi.fn(),
      title: "Delete?",
      description: "Sure?",
      confirmLabel: "Delete",
      onConfirm: vi.fn(),
    };
    const { rerender } = render(<ConfirmDialog {...props} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete" }));
    rerender(<ConfirmDialog {...props} open={false} />);
    await waitFor(() => expect(document.activeElement).toBe(opener));
    opener.remove();
  });

  it("calls onConfirm once from the confirm button", () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete year" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("confirms on Enter (owner item 27), once only", () => {
    const { onConfirm } = setup({ tone: "danger" });
    arm();
    const dialog = screen.getByRole("alertdialog");
    fireEvent.keyDown(document.activeElement ?? dialog, { key: "Enter" });
    fireEvent.keyUp(document.activeElement ?? dialog, { key: "Enter" });
    fireEvent.keyDown(document.activeElement ?? dialog, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("handles Enter itself, so the browser cannot also click the focused button", () => {
    setup({ tone: "danger" });
    const confirm = screen.getByRole("button", { name: "Delete year" });
    // fireEvent returns false when the handler called preventDefault.
    expect(fireEvent.keyDown(confirm, { key: "Enter" })).toBe(false);
  });

  it("ignores a repeating Enter from a held key", () => {
    const { onConfirm } = setup({ tone: "danger" });
    arm();
    const confirm = screen.getByRole("button", { name: "Delete year" });
    fireEvent.keyDown(confirm, { key: "Enter", repeat: true });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("ignores Enter still held from the press that opened it until it is released", () => {
    const onConfirm = vi.fn();
    const props: ConfirmDialogProps = {
      scope: "single",
      open: false,
      onOpenChange: vi.fn(),
      title: "Delete?",
      description: "Sure?",
      confirmLabel: "Delete",
      onConfirm,
    };
    const { rerender } = render(<ConfirmDialog {...props} />);
    arm();
    // Enter goes down on the page's Delete button and opens the dialog.
    fireEvent.keyDown(document.body, { key: "Enter" });
    rerender(<ConfirmDialog {...props} open />);
    arm();
    const confirm = screen.getByRole("button", { name: "Delete" });
    fireEvent.keyDown(confirm, { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.keyUp(confirm, { key: "Enter" });
    fireEvent.keyDown(confirm, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancels on Enter when the person has moved focus to Cancel", () => {
    const { onConfirm, onOpenChange } = setup({ tone: "danger" });
    arm();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    cancel.focus();
    fireEvent.keyDown(cancel, { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not confirm on Enter while pending", () => {
    const { onConfirm } = setup({ pending: true, keepFocusWhilePending: true });
    arm();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms on Enter from the confirm button of a type-to-confirm dialog once the text matches", () => {
    const { onConfirm } = setup({ requireText: "DELETE", confirmLabel: "Delete" });
    arm();
    const confirm = screen.getByRole("button", { name: "Delete" });
    fireEvent.keyDown(confirm, { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "delete" } });
    fireEvent.keyDown(confirm, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("bulk: focus starts on Cancel, and Enter confirms only from Confirm", () => {
    const { onConfirm } = setup({ scope: "bulk", confirmLabel: "Delete all records" });
    arm();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("button", { name: "Delete all records" }), { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("single: Enter on Confirm waits out the arming delay after opening", () => {
    const { onConfirm } = setup();
    const confirm = screen.getByRole("button", { name: "Delete year" });
    // A quick second press on the button that opened the dialog lands within the delay.
    fireEvent.keyDown(confirm, { key: "Enter" });
    fireEvent.keyUp(confirm, { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
    arm();
    fireEvent.keyDown(confirm, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("single: Space on Confirm is held back during the arming delay and when repeating", () => {
    setup();
    const confirm = screen.getByRole("button", { name: "Delete year" });
    // fireEvent returns false when the handler prevented the browser's own click.
    expect(fireEvent.keyDown(confirm, { key: " " })).toBe(false);
    expect(fireEvent.keyUp(confirm, { key: " " })).toBe(false);
    arm();
    expect(fireEvent.keyDown(confirm, { key: " " })).toBe(true);
    expect(fireEvent.keyDown(confirm, { key: " ", repeat: true })).toBe(false);
  });

  it("single: a Space press begun while arming and released after it does not confirm", () => {
    const { onConfirm } = setup();
    const confirm = screen.getByRole("button", { name: "Delete year" });
    expect(fireEvent.keyDown(confirm, { key: " " })).toBe(false);
    arm();
    // Released after the delay: still held back, because the press began inside it.
    expect(fireEvent.keyUp(confirm, { key: " " })).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
    // The next press, begun after the delay, is the button's own again.
    expect(fireEvent.keyDown(confirm, { key: " " })).toBe(true);
    expect(fireEvent.keyUp(confirm, { key: " " })).toBe(true);
  });

  it("leaves Enter on any other control alone, such as Sign in again", () => {
    const { onConfirm } = setup({
      error: "Your session has ended.",
      errorAction: <button type="button">Sign in again</button>,
    });
    const other = screen.getByRole("button", { name: "Sign in again" });
    // Not prevented, so the browser still clicks it; and it never confirms the delete.
    expect(fireEvent.keyDown(other, { key: "Enter" })).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("can confirm with Enter again after a failed attempt ends, even with the same error", () => {
    const onConfirm = vi.fn();
    const props: ConfirmDialogProps = {
      scope: "single",
      open: true,
      onOpenChange: vi.fn(),
      title: "Delete?",
      description: "Sure?",
      confirmLabel: "Delete",
      onConfirm,
      error: "Couldn't delete",
    };
    const { rerender } = render(<ConfirmDialog {...props} />);
    arm();
    const press = () => fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Enter" });
    press();
    rerender(<ConfirmDialog {...props} pending />);
    rerender(<ConfirmDialog {...props} pending={false} />);
    press();
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("does not confirm on Enter when pending or requireText does not match", () => {
    const { onConfirm } = setup({ requireText: "DELETE", confirmLabel: "Delete" });
    arm();
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "delete" } });
    fireEvent.keyDown(input, { key: "Enter" });
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

  it("can keep the confirm button focusable while pending", () => {
    const { onConfirm } = setup({ pending: true, keepFocusWhilePending: true });
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    const confirm = screen.getByRole("button", { name: "Delete year" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows an error action next to the error only", () => {
    const action = <button type="button">Sign in again</button>;
    setup({ errorAction: action });
    expect(screen.queryByRole("button", { name: "Sign in again" })).toBeNull();
    cleanup();
    setup({ error: "Sign in first", errorAction: action });
    expect(screen.getByRole("alert").textContent).toBe("Sign in first");
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeDefined();
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

  it("clears typed text when the parent closes and reopens the dialog", () => {
    const props: ConfirmDialogProps = {
      scope: "single",
      open: true,
      onOpenChange: vi.fn(),
      title: "Reset data?",
      description: "This cannot be undone.",
      confirmLabel: "Reset",
      onConfirm: vi.fn(),
      requireText: "RESET",
    };
    const { rerender } = render(<ConfirmDialog {...props} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "RESET" } });
    expect((screen.getByRole("button", { name: "Reset" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    rerender(<ConfirmDialog {...props} open={false} />);
    rerender(<ConfirmDialog {...props} open />);
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("button", { name: "Reset" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
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

  describe("opens at its title, without scrolling the dialog (P09)", () => {
    /**
     * jsdom never scrolls, so the spy stands in for a browser that scrolls the dialog to the
     * focused button: it records which button took focus and sets the dialog's scrollTop to 120.
     * The dialog must then put it back to 0.
     */
    const spyOnFocus = () => {
      let scrollTop = 0;
      const focused: string[] = [];
      const focus = vi.spyOn(HTMLButtonElement.prototype, "focus").mockImplementation(function (
        this: HTMLButtonElement,
      ) {
        focused.push(this.textContent ?? "");
        const dialog = this.closest<HTMLElement>('[role="alertdialog"]');
        if (dialog && !Object.hasOwn(dialog, "scrollTop")) {
          Object.defineProperty(dialog, "scrollTop", {
            configurable: true,
            get: () => scrollTop,
            set: (value: number) => {
              scrollTop = value;
            },
          });
        }
        scrollTop = 120;
      });
      return { focus, focused, scrollTop: () => scrollTop };
    };

    it("single: Confirm takes focus with preventScroll and the dialog is back at the top", () => {
      const spy = spyOnFocus();
      setup({ scope: "single" });
      expect(spy.focus).toHaveBeenCalledWith({ preventScroll: true });
      expect(spy.focused).toEqual(["Delete year"]);
      expect(screen.getByRole("alertdialog").scrollTop).toBe(0);
      spy.focus.mockRestore();
    });

    it("bulk: Cancel takes focus with preventScroll and the dialog is back at the top", () => {
      const spy = spyOnFocus();
      setup({ scope: "bulk" });
      expect(spy.focus).toHaveBeenCalledWith({ preventScroll: true });
      expect(spy.focused).toEqual(["Cancel"]);
      expect(screen.getByRole("alertdialog").scrollTop).toBe(0);
      spy.focus.mockRestore();
    });

    it("type to confirm: Cancel takes focus, as for bulk", () => {
      const spy = spyOnFocus();
      setup({ scope: "single", requireText: "delete" });
      expect(spy.focused).toEqual(["Cancel"]);
      expect(screen.getByRole("alertdialog").scrollTop).toBe(0);
      spy.focus.mockRestore();
    });
  });

  it("sets the type-to-confirm field at 16px so iOS does not zoom (P09)", () => {
    setup({ requireText: "delete" });
    const input = screen.getByRole("textbox");
    // fontSizes.md is the 16px step; sm (14px) made iOS zoom on focus.
    expect(input.className).toContain("fs_md");
    expect(input.className).not.toContain("fs_sm");
    expect(input.className).toContain("[@media_(pointer:_coarse)]:h_touch");
  });
});
