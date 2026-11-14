import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavDrawer } from "./NavDrawer";
import { navDrawerLink } from "./NavDrawer.styles";

const renderDrawer = (isOpen = true) => {
  const onClose = vi.fn();
  render(
    <>
      <button type="button">Opener</button>
      <NavDrawer
        footer={<button type="button">Footer action</button>}
        isOpen={isOpen}
        onClose={onClose}
      >
        <a className={navDrawerLink()} href="/one">
          One
        </a>
      </NavDrawer>
    </>,
  );
  return onClose;
};

describe("NavDrawer", () => {
  it("renders nothing while closed", () => {
    renderDrawer(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a modal dialog that focuses the close button on open", () => {
    renderDrawer();
    const dialog = screen.getByRole("dialog", { name: "Mobile Navigation Drawer" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close navigation menu" }),
    );
  });

  it("closes from the close button, the backdrop and Escape", () => {
    const onClose = renderDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Close navigation menu" }));
    fireEvent.click(screen.getByTestId("mobile-drawer-backdrop"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("wraps Tab from the last control to the first and Shift+Tab back", () => {
    renderDrawer();
    const close = screen.getByRole("button", { name: "Close navigation menu" });
    const last = screen.getByRole("button", { name: "Footer action" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("returns focus to the opener when closed", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Opener</button>
        <NavDrawer isOpen={false} onClose={onClose}>
          <span />
        </NavDrawer>
      </>,
    );
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();
    rerender(
      <>
        <button type="button">Opener</button>
        <NavDrawer isOpen onClose={onClose}>
          <span />
        </NavDrawer>
      </>,
    );
    rerender(
      <>
        <button type="button">Opener</button>
        <NavDrawer isOpen={false} onClose={onClose}>
          <span />
        </NavDrawer>
      </>,
    );
    expect(document.activeElement).toBe(opener);
  });
});
