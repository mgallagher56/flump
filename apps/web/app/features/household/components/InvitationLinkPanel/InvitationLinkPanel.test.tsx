import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InvitationLinkPanel, type InvitationLinkPanelProps } from "./InvitationLinkPanel";

const LINK = "https://app.example/household/join/abc";
const EXPIRES = "2026-11-27T10:00:00.000Z";

const renderPanel = (props: Partial<InvitationLinkPanelProps> = {}) => {
  const onCreate = vi.fn();
  const onCancel = vi.fn();
  render(
    <InvitationLinkPanel
      error={null}
      expiresAt={null}
      link={null}
      pending={null}
      onCancel={onCancel}
      onCreate={onCreate}
      {...props}
    />,
  );
  return { onCreate, onCancel };
};

describe("<InvitationLinkPanel />", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("with no link, says Flump sends nothing and offers only to make one", () => {
    const { onCreate } = renderPanel();
    expect(
      screen.getByText(
        "Make a link and give it to the other person yourself. Flump sends nothing.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "Cancel link" })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Make a link" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("shows a link just made once, with when it stops working, and copies it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { onCancel } = renderPanel({ link: LINK, expiresAt: EXPIRES });
    expect(
      (screen.getByRole("textbox", { name: "Invitation link" }) as HTMLInputElement).value,
    ).toBe(LINK);
    expect(
      screen.getByText(/stops working on 27 Nov 2026\. It will not be shown again\./),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /Make a/ })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeDefined();
    // Said once through the polite live region, for screen readers.
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Link copied"));
    expect(screen.queryByText(/We could not copy the link/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel link" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("labels the link field with visible text", () => {
    renderPanel({ link: LINK });
    const label = screen.getByText("Invitation link", { selector: "label" });
    const field = screen.getByRole("textbox", { name: "Invitation link" });
    expect(label.getAttribute("for")).toBe(field.id);
  });

  it.each([
    ["no clipboard", () => vi.stubGlobal("navigator", {})],
    [
      "a clipboard that refuses",
      () =>
        vi.stubGlobal("navigator", {
          clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
        }),
    ],
  ])("with %s, says plainly to copy the link by hand and announces nothing", async (_l, stub) => {
    stub();
    renderPanel({ link: LINK });
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(
      await screen.findByText("We could not copy the link. Select it above and copy it yourself."),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("with an open link already shown, gives its end date, a new link and cancel, but not the link", () => {
    const { onCreate, onCancel } = renderPanel({ expiresAt: EXPIRES });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(
      screen.getByText(/Your link works until 27 Nov 2026\. It cannot be shown again\./),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Make a new link" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel link" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("while pending, repeats the verb and disables both buttons", () => {
    renderPanel({ expiresAt: EXPIRES, pending: "cancel" });
    expect(
      (screen.getByRole("button", { name: "Cancelling…" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Make a new link" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("shows an error as an alert, and none when there is no error", () => {
    renderPanel({ error: "You are already in a household." });
    expect(screen.getByRole("alert").textContent).toContain("You are already in a household.");
  });

  it("shows no alert without an error", () => {
    renderPanel();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
