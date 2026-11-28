import type { BetaInviteDto } from "@flump/api-contract";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InviteList } from "./InviteList";

const base = {
  createdAt: "2026-11-20T09:00:00.000Z",
  expiresAt: "2026-12-04T09:00:00.000Z",
  usedAt: null,
  usedByName: null,
  usedByEmail: null,
};
const INVITES: BetaInviteDto[] = [
  { ...base, id: "00000000-0000-4000-8000-000000000001", label: "Sam", status: "unused" },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000002",
    label: null,
    status: "used",
    usedAt: "2026-11-21T09:00:00.000Z",
  },
  { ...base, id: "00000000-0000-4000-8000-000000000003", label: "Alex", status: "cancelled" },
  { ...base, id: "00000000-0000-4000-8000-000000000004", label: "Kim", status: "expired" },
];

describe("<InviteList />", () => {
  it("shows each link's label, status and dates, with Cancel only on unused links", () => {
    const onCancel = vi.fn();
    render(<InviteList invites={INVITES} onCancel={onCancel} />);
    const rows = within(screen.getByRole("list", { name: "Invite links" })).getAllByRole(
      "listitem",
    );
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain("Not used yet");
    expect(rows[0].textContent).toContain("works until 4 Dec 2026");
    expect(rows[1].textContent).toContain("No label");
    expect(rows[1].textContent).toContain("used 21 Nov 2026");
    expect(rows[2].textContent).toContain("Cancelled");
    expect(rows[3].textContent).toContain("Expired");
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel link for Sam" }));
    expect(onCancel).toHaveBeenCalledWith(INVITES[0].id);
  });

  it("disables the link being cancelled", () => {
    render(<InviteList invites={INVITES} pendingId={INVITES[0].id} onCancel={vi.fn()} />);
    expect(
      (screen.getByRole("button", { name: "Cancelling for Sam" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("names who used a used link, by name and email address", () => {
    const email = `ada@${["example", "com"].join(".")}`;
    const used = { ...INVITES[1], usedByName: "Ada Lovelace", usedByEmail: email };
    const { rerender } = render(<InviteList invites={[used]} onCancel={vi.fn()} />);
    expect(screen.getByText(`Used by Ada Lovelace, ${email}`)).toBeDefined();
    rerender(<InviteList invites={[{ ...used, usedByName: null }]} onCancel={vi.fn()} />);
    expect(screen.getByText(`Used by ${email}`)).toBeDefined();
    // Unknown (an erased account, or the provider could not answer): no line at all.
    rerender(<InviteList invites={[INVITES[1]]} onCancel={vi.fn()} />);
    expect(screen.queryByText(/Used by/)).toBeNull();
  });

  it("says when there are no links", () => {
    render(<InviteList invites={[]} onCancel={vi.fn()} />);
    expect(screen.getByText("No invite links yet.")).toBeDefined();
  });
});
