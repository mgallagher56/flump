import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountLinkNotice, type AccountLinkNoticeProps } from "./AccountLinkNotice";

const renderNotice = (over: Partial<AccountLinkNoticeProps> = {}) => {
  const props: AccountLinkNoticeProps = {
    offer: { rowName: "Car loan payment", accountName: "Car loan", monthly: 265, link: "debt" },
    onLink: vi.fn().mockResolvedValue(undefined),
    onKeep: vi.fn(),
    ...over,
  };
  render(<AccountLinkNotice {...props} />);
  return props;
};

describe("AccountLinkNotice", () => {
  it("names the entry, the account and its payment, in whole pounds", () => {
    renderNotice({
      offer: {
        rowName: "Car loan payment",
        accountName: "Car loan",
        monthly: 1265.4,
        link: "debt",
      },
    });
    const note = screen.getByRole("note", { name: "About Car loan payment" });
    expect(note.textContent).toContain(
      "This matches the monthly payment of £1,265 a month on Car loan. Link it and it changes when the account does.",
    );
  });

  it("calls a savings account's amount the monthly saving", () => {
    renderNotice({
      offer: { rowName: "Savings", accountName: "Saver", monthly: 250, link: "savings" },
    });
    expect(screen.getByRole("note").textContent).toContain(
      "monthly saving of £250 a month on Saver",
    );
  });

  it("gives its two choices equal weight (P69)", () => {
    renderNotice();
    const link = screen.getByRole("button", { name: "Link to Car loan" });
    const keep = screen.getByRole("button", { name: "Keep my own figure" });
    expect(keep.className).toBe(link.className);
  });

  it("Link calls onLink", async () => {
    const { onLink } = renderNotice();
    fireEvent.click(screen.getByRole("button", { name: "Link to Car loan" }));
    await waitFor(() => expect(onLink).toHaveBeenCalledTimes(1));
  });

  it("keeps the note when the link fails", async () => {
    const onLink = vi.fn().mockRejectedValue(new Error("no"));
    renderNotice({ onLink });
    fireEvent.click(screen.getByRole("button", { name: "Link to Car loan" }));
    await waitFor(() => expect(onLink).toHaveBeenCalled());
    expect(screen.getByRole("note")).toBeDefined();
  });

  it("Keep my own figure calls onKeep", () => {
    const { onKeep } = renderNotice();
    fireEvent.click(screen.getByRole("button", { name: "Keep my own figure" }));
    expect(onKeep).toHaveBeenCalledTimes(1);
  });
});
