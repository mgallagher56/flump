import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewInviteLink } from "./NewInviteLink";

const LINK = "https://app.example/invite/abc";

describe("<NewInviteLink />", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the link once with when it stops working, and copies it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<NewInviteLink expiresAt="2026-12-04T10:00:00.000Z" label="Sam" link={LINK} />);
    expect(screen.getByRole("heading", { name: "Invite link for Sam" })).toBeDefined();
    expect((screen.getByRole("textbox", { name: "Invite link" }) as HTMLInputElement).value).toBe(
      LINK,
    );
    expect(screen.getByText(/stops working on 4 Dec 2026/)).toBeDefined();
    expect(screen.getByText(/will not be shown again/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeDefined();
  });

  it("names it plainly with no label", () => {
    render(<NewInviteLink expiresAt="2026-12-04T10:00:00.000Z" label={null} link={LINK} />);
    expect(screen.getByRole("heading", { name: "Invite link" })).toBeDefined();
  });
});
