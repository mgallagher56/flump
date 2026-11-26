import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LEAVE_LINE, LeaveHouseholdSection } from "./LeaveHouseholdSection";

const renderSection = (extra: { pending?: boolean; error?: string | null } = {}) => {
  const onConfirm = vi.fn();
  render(
    <LeaveHouseholdSection
      error={extra.error ?? null}
      pending={extra.pending ?? false}
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm };
};

describe("<LeaveHouseholdSection />", () => {
  it("says leaving deletes nothing and Flump tells the other person nothing", () => {
    renderSection();
    expect(screen.getByText(LEAVE_LINE)).toBeDefined();
    expect(LEAVE_LINE).toBe(
      "Leave now. Nothing of yours is deleted. Flump does not tell the other person.",
    );
  });

  it("asks once, then leaves on confirm with no typed word or anyone's approval", async () => {
    const { onConfirm } = renderSection();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Leave household" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).queryByRole("textbox")).toBeNull();
    const confirm = within(dialog).getByRole("button", {
      name: "Leave household",
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Stay closes the dialog without leaving", async () => {
    const { onConfirm } = renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Leave household" }));
    fireEvent.click(await screen.findByRole("button", { name: "Stay" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows a failure in the dialog", async () => {
    renderSection({ error: "We could not reach Flump. Check your connection and try again." });
    fireEvent.click(screen.getByRole("button", { name: "Leave household" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(
      "We could not reach Flump. Check your connection and try again.",
    );
  });

  it("while leaving, the confirm button says Leaving… and cannot be pressed again", async () => {
    renderSection({ pending: true });
    fireEvent.click(screen.getByRole("button", { name: "Leave household" }));
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Leaving…" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });
});
