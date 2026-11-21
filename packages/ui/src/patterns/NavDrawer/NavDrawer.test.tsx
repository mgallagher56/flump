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
  it("keeps focus where it is when the parent re-renders with a new onClose", () => {
    const { rerender } = render(
      <NavDrawer footer={<button type="button">Footer action</button>} isOpen onClose={() => {}}>
        <span />
      </NavDrawer>,
    );
    const action = screen.getByRole("button", { name: "Footer action" });
    action.focus();
    rerender(
      <NavDrawer footer={<button type="button">Footer action</button>} isOpen onClose={() => {}}>
        <span />
      </NavDrawer>,
    );
    expect(document.activeElement).toBe(action);
  });

  it("locks page scroll while open and releases it on close (P11, P70)", () => {
    const { rerender } = render(
      <NavDrawer isOpen onClose={vi.fn()}>
        <span />
      </NavDrawer>,
    );
    // Radix's remove-scroll (the Dialog primitive's lock) marks the body while it holds the page.
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(true);
    rerender(
      <NavDrawer isOpen={false} onClose={vi.fn()}>
        <span />
      </NavDrawer>,
    );
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
  });

  it("returns focus without scrolling the page to the opener (P12)", () => {
    const onClose = vi.fn();
    const tree = (isOpen: boolean) => (
      <>
        <button type="button">Opener</button>
        <NavDrawer isOpen={isOpen} onClose={onClose}>
          <span />
        </NavDrawer>
      </>
    );
    const { rerender } = render(tree(false));
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();
    const focusSpy = vi.spyOn(opener, "focus");
    rerender(tree(true));
    rerender(tree(false));
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});

describe("NavDrawer keyboard and mounting", () => {
  it("renders into document.body, outside the component's own container", () => {
    const { container } = render(
      <NavDrawer isOpen onClose={vi.fn()}>
        <span />
      </NavDrawer>,
    );
    const layer = screen.getByTestId("mobile-drawer-layer");
    expect(container.contains(layer)).toBe(false);
    expect(layer.parentElement).toBe(document.body);
  });

  it("does not call onClose on Escape while closed", () => {
    const onClose = renderDrawer(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stops listening for Escape once closed, and starts when opened later", () => {
    const onClose = vi.fn();
    const tree = (isOpen: boolean) => (
      <NavDrawer isOpen={isOpen} onClose={onClose}>
        <span />
      </NavDrawer>
    );
    const { rerender } = render(tree(false));
    rerender(tree(true));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(tree(false));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves other keys alone on the last control", () => {
    renderDrawer();
    const last = screen.getByRole("button", { name: "Footer action" });
    last.focus();
    expect(fireEvent.keyDown(document, { key: "ArrowDown" })).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it("does not wrap Tab or Shift+Tab from a control in the middle", () => {
    renderDrawer();
    const middle = screen.getByRole("link", { name: "One" });
    middle.focus();
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(true);
    expect(document.activeElement).toBe(middle);
    expect(fireEvent.keyDown(document, { key: "Tab", shiftKey: true })).toBe(true);
    expect(document.activeElement).toBe(middle);
  });

  it("brings focus that escaped the drawer back in, to the first or the last control", () => {
    renderDrawer();
    const close = screen.getByRole("button", { name: "Close navigation menu" });
    const last = screen.getByRole("button", { name: "Footer action" });
    const outside = screen.getByRole("button", { name: "Opener" });
    outside.focus();
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(close);
    outside.focus();
    expect(fireEvent.keyDown(document, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(last);
  });

  it("shows the logo it is given", () => {
    render(
      <NavDrawer isOpen logo={<span>Flump logo</span>} onClose={vi.fn()}>
        <span />
      </NavDrawer>,
    );
    expect(screen.getByText("Flump logo")).toBeDefined();
  });
});
