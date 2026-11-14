import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeleteAccountStatus } from "~/features/settings/account";
import { FinishDeletionPanel } from "./FinishDeletionPanel";

const setup = () => {
  const onConfirm = vi.fn();
  const view = render(<FinishDeletionPanel status="idle" onConfirm={onConfirm} />);
  const rerender = (next: DeleteAccountStatus) =>
    view.rerender(<FinishDeletionPanel status={next} onConfirm={onConfirm} />);
  const confirm = () => {
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByTestId("finish-deletion-submit"));
  };
  return { onConfirm, rerender, confirm };
};

describe("<FinishDeletionPanel />", () => {
  it("explains the last step and keeps the button disabled until DELETE is typed", () => {
    const { onConfirm } = setup();
    expect(screen.getByRole("heading", { name: "Finish deleting your account" })).toBeDefined();
    const submit = screen.getByRole("button", { name: "Remove my login" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), { target: { value: "DEL" } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("submits once on a fast double click and shows a pending state", () => {
    const { onConfirm, rerender, confirm } = setup();
    confirm();
    fireEvent.click(screen.getByTestId("finish-deletion-submit"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    rerender("submitting");
    const pending = screen.getByRole("button", { name: "Removing" }) as HTMLButtonElement;
    // Stays focusable while pending so focus does not drop to the page.
    expect(pending.disabled).toBe(false);
    expect(pending.getAttribute("aria-disabled")).toBe("true");
  });

  it("offers another try when the login still could not be removed", () => {
    const { onConfirm, rerender, confirm } = setup();
    confirm();
    rerender("submitting");
    rerender("identity_pending");
    expect(screen.getByRole("alert").textContent).toContain(
      "We still could not remove your login. Try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("asks for a fresh sign-in that returns to this page", () => {
    const { rerender, confirm } = setup();
    confirm();
    rerender("submitting");
    rerender("recent_login_required");
    expect(screen.getByRole("alert").textContent).toContain(
      "For your security, sign in again, then try again.",
    );
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeDefined();
  });

  it.each([
    ["rate_limited", "Wait a little, then try again."],
    ["failed", "We could not remove your login. Try again."],
  ] as const)("announces %s", (status, text) => {
    const { rerender, confirm } = setup();
    confirm();
    rerender(status);
    expect(screen.getByRole("alert").textContent).toContain(text);
  });
});
