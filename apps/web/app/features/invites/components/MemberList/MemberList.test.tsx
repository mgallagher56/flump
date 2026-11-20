import type { BetaMemberDto } from "@flump/api-contract";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemberList } from "./MemberList";

const MEMBERS: BetaMemberDto[] = [
  { userId: "user_sam", label: "Sam", addedAt: "2026-11-21T09:00:00.000Z" },
  { userId: "user_x", label: null, addedAt: "2026-11-22T09:00:00.000Z" },
];

describe("<MemberList />", () => {
  it("lists people with the date they joined", () => {
    render(<MemberList members={MEMBERS} onRemove={vi.fn()} />);
    expect(screen.getByText("Sam")).toBeDefined();
    expect(screen.getByText("No label")).toBeDefined();
    expect(screen.getByText("Joined 21 Nov 2026")).toBeDefined();
  });

  it("asks before removing access, then removes that person", async () => {
    vi.useFakeTimers();
    try {
      const onRemove = vi.fn();
      render(<MemberList members={MEMBERS} onRemove={onRemove} />);
      fireEvent.click(screen.getByRole("button", { name: "Remove access for Sam" }));
      expect(onRemove).not.toHaveBeenCalled();
      expect(screen.getByRole("alertdialog", { name: "Remove access for Sam?" })).toBeDefined();
      expect(screen.getByText(/Their data is kept/)).toBeDefined();
      // The confirm button arms after a short delay so a double press cannot confirm.
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      fireEvent.click(screen.getByTestId("remove-access-confirm"));
      await act(async () => {});
      expect(onRemove).toHaveBeenCalledWith("user_sam");
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes the dialog once the person is no longer listed", async () => {
    const { rerender } = render(<MemberList members={MEMBERS} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove access for Sam" }));
    expect(screen.getByRole("alertdialog")).toBeDefined();
    rerender(<MemberList members={MEMBERS.slice(1)} onRemove={vi.fn()} />);
    await act(async () => {});
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("says when nobody has joined", () => {
    render(<MemberList members={[]} onRemove={vi.fn()} />);
    expect(screen.getByText("Nobody has joined through an invite link yet.")).toBeDefined();
  });
});
