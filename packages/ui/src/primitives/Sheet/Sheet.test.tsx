import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";
import { sheetBodyRecipe } from "./Sheet.styles";

const ReturnHarness = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Controls">
        <button type="button">inside</button>
      </Sheet>
    </>
  );
};

describe("Sheet primitive", () => {
  it("renders nothing while closed", () => {
    render(
      <Sheet open={false} onOpenChange={() => {}} title="Controls">
        x
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("exposes role=dialog, aria-modal, a name and a description", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="Adjust inputs" description="Changes apply live">
        <input aria-label="Rate" />
      </Sheet>,
    );
    const sheet = screen.getByRole("dialog", { name: "Adjust inputs" });
    expect(sheet.getAttribute("aria-modal")).toBe("true");
    const desc = document.getElementById(sheet.getAttribute("aria-describedby") as string);
    expect(desc?.textContent).toBe("Changes apply live");
  });

  it("omits aria-describedby without a description", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="Controls">
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog").hasAttribute("aria-describedby")).toBe(false);
  });

  it("keeps a hidden title in the accessibility tree", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="Controls" hideTitle>
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog", { name: "Controls" })).toBeDefined();
  });

  it("closes on Escape and via the labelled close button", () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange} title="Controls" closeLabel="Close controls">
        x
      </Sheet>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Close controls" }));
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it("traps focus inside and returns it to the opener", async () => {
    render(<ReturnHarness />);
    const opener = screen.getByRole("button", { name: "open" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    expect(document.querySelectorAll("[data-radix-focus-guard]").length).toBeGreaterThan(0);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("keeps the footer outside the scrolling body", () => {
    render(
      <Sheet
        open
        onOpenChange={() => {}}
        title="T"
        side="right"
        footer={<button type="button">Apply</button>}
      >
        <p>body</p>
      </Sheet>,
    );
    const body = screen.getByText("body").parentElement as HTMLElement;
    const apply = screen.getByRole("button", { name: "Apply" });
    expect(body.contains(apply)).toBe(false);
    expect(screen.getByRole("dialog").contains(apply)).toBe(true);
  });

  it("renders through a portal on document.body", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="T">
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog").parentElement).toBe(document.body);
  });

  it("has no decorative grab handle and is sized to its content (P31)", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="T">
        <p>body</p>
      </Sheet>,
    );
    const sheet = screen.getByRole("dialog");
    // First child is the header (title and close), not an aria-hidden handle bar.
    expect(sheet.querySelector(":scope > [aria-hidden='true']")).toBeNull();
    expect(sheet.className).toContain("h_auto");
  });

  // jsdom has no layout, so these read the resolved style declarations; the SideRight story
  // checks the real layout (footer pinned to the bottom of the full-height sheet).
  it("bottom sheet body sizes to its content and never grows into an empty band (P31)", () => {
    const style = sheetBodyRecipe.raw({ side: "bottom" }) as { flex?: unknown };
    // flex-grow 0: no empty band; flex-shrink 1: it still shrinks to the height cap and scrolls.
    expect(style.flex).toBe("0 1 auto");
  });

  it("right sheet body grows from md so the footer sits at the bottom of the full-height sheet", () => {
    const style = sheetBodyRecipe.raw({ side: "right" }) as { flex?: unknown };
    // Under md the right sheet is a bottom sheet, so it keeps the content-sized body.
    expect(style.flex).toEqual({ base: "0 1 auto", md: "1 1 auto" });
  });

  it("passes its side to the body", () => {
    render(
      <Sheet open onOpenChange={() => {}} side="right" title="T">
        <p>body</p>
      </Sheet>,
    );
    expect((screen.getByText("body").parentElement as HTMLElement).className).toBe(
      sheetBodyRecipe({ side: "right" }),
    );
  });

  it("names its surface and side on the dialog element", () => {
    const { rerender } = render(
      <Sheet open onOpenChange={() => {}} title="T">
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog").getAttribute("data-sheet-side")).toBe("bottom");
    rerender(
      <Sheet open onOpenChange={() => {}} side="right" title="T">
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog").getAttribute("data-sheet-side")).toBe("right");
  });

  it("pads the sides and the side sheet's top by the safe-area insets (P15)", () => {
    render(
      <Sheet open onOpenChange={() => {}} side="right" title="T">
        x
      </Sheet>,
    );
    const cls = screen.getByRole("dialog").className;
    expect(cls).toContain("env(safe-area-inset-left,_0px)");
    expect(cls).toContain("env(safe-area-inset-right,_0px)");
    expect(cls).toContain("env(safe-area-inset-top,_0px)");
  });
});

describe("keyboard inset while open", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("publishes the space above the on-screen keyboard while open", () => {
    // A stand-in visualViewport: 476 of an 812 tall page visible, so 812 - 476 = 336 covered.
    const viewport = Object.assign(new EventTarget(), { height: 476, offsetTop: 0 });
    vi.stubGlobal("visualViewport", viewport);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(812);
    const { unmount } = render(
      <Sheet open onOpenChange={() => {}} title="Controls">
        x
      </Sheet>,
    );
    expect(document.documentElement.style.getPropertyValue("--keyboard-inset")).toBe("336px");
    unmount();
  });
});
