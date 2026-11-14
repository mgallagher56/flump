import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeleteAccountStatus } from "~/features/settings/account";
import { DeleteAccountSection, IDENTITY_PENDING_MESSAGE } from "./DeleteAccountSection";

const setup = (status: DeleteAccountStatus = "idle") => {
  const onConfirm = vi.fn();
  const view = render(<DeleteAccountSection status={status} onConfirm={onConfirm} />);
  fireEvent.click(screen.getByTestId("delete-account-trigger"));
  const rerender = (next: DeleteAccountStatus) =>
    view.rerender(<DeleteAccountSection status={next} onConfirm={onConfirm} />);
  return { onConfirm, rerender };
};

const typePhrase = (value: string) =>
  fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value } });

describe("<DeleteAccountSection />", () => {
  it("does nothing until the dialog is opened", () => {
    const onConfirm = vi.fn();
    render(<DeleteAccountSection status="idle" onConfirm={onConfirm} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("explains what is removed and keeps the delete button disabled until DELETE is typed", () => {
    const { onConfirm } = setup();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("This permanently deletes:");
    expect(dialog.textContent).toContain("Your login");
    expect(dialog.textContent).toContain("AI assistant access and its activity log");
    expect(dialog.textContent).toContain("with no personal details, for 24 months");

    const confirm = screen.getByRole("button", { name: "Delete my account" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    typePhrase("DELET");
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();

    typePhrase("DELETE");
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("submits once even when the button is clicked twice quickly", () => {
    const { onConfirm } = setup();
    typePhrase("DELETE");
    const confirm = screen.getByRole("button", { name: "Delete my account" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows a pending state while the request runs", () => {
    const { rerender } = setup();
    typePhrase("DELETE");
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    rerender("submitting");
    const pending = screen.getByRole("button", { name: "Deleting" }) as HTMLButtonElement;
    // Stays focusable while pending so focus does not drop to the page.
    expect(pending.disabled).toBe(false);
    expect(pending.getAttribute("aria-disabled")).toBe("true");
    expect(pending.getAttribute("aria-busy")).toBe("true");
  });

  it("announces a generic failure and keeps the dialog open", () => {
    const { rerender } = setup();
    typePhrase("DELETE");
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    rerender("submitting");
    rerender("failed");
    expect(screen.getByRole("alert").textContent).toBe(
      "We could not delete your account. Try again.",
    );
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });

  it("explains a rate limit", () => {
    const { rerender } = setup();
    typePhrase("DELETE");
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    rerender("rate_limited");
    expect(screen.getByRole("alert").textContent).toContain("Wait a little");
  });

  it("asks for a fresh sign-in when the backend needs a recent login", () => {
    const { rerender } = setup();
    typePhrase("DELETE");
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(screen.queryByRole("button", { name: "Sign in again" })).toBeNull();
    rerender("submitting");
    rerender("recent_login_required");
    expect(screen.getByRole("alert").textContent).toBe(
      "For your security, sign in again, then try again.",
    );
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeDefined();
  });

  it("offers a retry when the login could not be removed", () => {
    const { onConfirm, rerender } = setup();
    typePhrase("DELETE");
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    rerender("submitting");
    rerender("identity_pending");
    expect(screen.getByRole("alert").textContent).toBe(IDENTITY_PENDING_MESSAGE);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("does not show an earlier failure when the dialog is reopened", () => {
    const { rerender } = setup();
    typePhrase("DELETE");
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    rerender("failed");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByTestId("delete-account-trigger"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
