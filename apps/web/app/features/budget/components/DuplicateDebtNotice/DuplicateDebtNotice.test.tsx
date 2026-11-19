import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DuplicateDebtNotice } from "./DuplicateDebtNotice";

const renderNotice = (over: Partial<Parameters<typeof DuplicateDebtNotice>[0]> = {}) => {
  const props = {
    rowName: "Car loan payment",
    debtAccountName: "Car loan",
    monthlyAmount: 265,
    onMove: vi.fn().mockResolvedValue(undefined),
    onKeep: vi.fn(),
    ...over,
  };
  render(<DuplicateDebtNotice {...props} />);
  return props;
};

describe("DuplicateDebtNotice", () => {
  it("names the entry and the debt, with the amount in whole pounds", () => {
    renderNotice({ monthlyAmount: 1265.4 });
    const note = screen.getByRole("note", { name: "About Car loan payment" });
    expect(note.textContent).toContain(
      "This looks like your Car loan payment of £1,265 a month, which is already counted with your debts.",
    );
    expect(note.textContent).toContain("Move it to debts so it is counted once?");
  });

  it("gives its two choices equal weight (P69)", () => {
    renderNotice();
    const move = screen.getByRole("button", { name: "Move to debts" });
    const keep = screen.getByRole("button", { name: "Keep it here" });
    expect(keep.className).toBe(move.className);
  });

  it("Move to debts calls onMove", async () => {
    const { onMove } = renderNotice();
    fireEvent.click(screen.getByRole("button", { name: "Move to debts" }));
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
  });

  it("keeps the note when the move fails", async () => {
    const onMove = vi.fn().mockRejectedValue(new Error("no"));
    renderNotice({ onMove });
    fireEvent.click(screen.getByRole("button", { name: "Move to debts" }));
    await waitFor(() => expect(onMove).toHaveBeenCalled());
    expect(screen.getByRole("note")).toBeDefined();
  });

  it("Keep it here calls onKeep", () => {
    const { onKeep } = renderNotice();
    fireEvent.click(screen.getByRole("button", { name: "Keep it here" }));
    expect(onKeep).toHaveBeenCalledTimes(1);
  });
});
