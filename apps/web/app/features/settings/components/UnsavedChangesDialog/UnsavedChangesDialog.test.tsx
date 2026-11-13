import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

describe("<UnsavedChangesDialog />", () => {
  it("renders nothing when closed", () => {
    render(<UnsavedChangesDialog open={false} onDiscard={vi.fn()} onKeepEditing={vi.fn()} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("discards when confirmed", () => {
    const onDiscard = vi.fn();
    const onKeepEditing = vi.fn();
    render(<UnsavedChangesDialog open onDiscard={onDiscard} onKeepEditing={onKeepEditing} />);
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onKeepEditing).not.toHaveBeenCalled();
  });

  it("keeps editing on Keep editing and on Escape", () => {
    const onKeepEditing = vi.fn();
    render(<UnsavedChangesDialog open onDiscard={vi.fn()} onKeepEditing={onKeepEditing} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(onKeepEditing).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onKeepEditing).toHaveBeenCalledTimes(2);
  });
});
