import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { focusWithoutJump, useDialogFocusReturn } from "./useDialogFocusReturn";

const makeButton = (box: { top: number; height: number }) => {
  const button = document.createElement("button");
  document.body.appendChild(button);
  button.getBoundingClientRect = () =>
    ({
      top: box.top,
      bottom: box.top + box.height,
      left: 16,
      right: 116,
      width: 100,
      height: box.height,
      x: 16,
      y: box.top,
      toJSON: () => ({}),
    }) as DOMRect;
  const scrollIntoView = vi.fn();
  button.scrollIntoView = scrollIntoView;
  return { button, scrollIntoView };
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("focusWithoutJump (phone audit P12)", () => {
  it("focuses with preventScroll and leaves the page still when the opener is in view", () => {
    // jsdom's window is 1024 x 768; a 40px button at top 200 sits wholly inside it.
    const { button, scrollIntoView } = makeButton({ top: 200, height: 40 });
    const focus = vi.spyOn(button, "focus");
    focusWithoutJump(button);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(button);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("brings an opener that is now off screen back by the least scroll", () => {
    // Top 900 is below the 768px window, so the opener is out of view.
    const { button, scrollIntoView } = makeButton({ top: 900, height: 40 });
    focusWithoutJump(button);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
  });

  it("brings back an opener scrolled away above the window", () => {
    // Bottom at -200: the reader scrolled 240px on past a header action.
    const { button, scrollIntoView } = makeButton({ top: -240, height: 40 });
    focusWithoutJump(button);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

describe("focusWithoutJump edges", () => {
  // The test window is 1024 x 768.
  const place = (box: { top: number; left: number; width: number; height: number }) => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.getBoundingClientRect = () =>
      ({
        top: box.top,
        left: box.left,
        bottom: box.top + box.height,
        right: box.left + box.width,
        width: box.width,
        height: box.height,
        x: box.left,
        y: box.top,
        toJSON: () => ({}),
      }) as DOMRect;
    const scrollIntoView = vi.fn();
    button.scrollIntoView = scrollIntoView;
    focusWithoutJump(button);
    return scrollIntoView.mock.calls.length > 0;
  };

  it.each([
    ["touching the top left corner", { top: 0, left: 0, width: 100, height: 40 }],
    // Bottom 728 + 40 = 768 and right 924 + 100 = 1024: on the edges, still in view.
    ["touching the bottom right corner", { top: 728, left: 924, width: 100, height: 40 }],
  ])("leaves the page still for an opener %s", (_name, box) => {
    expect(place(box)).toBe(false);
  });

  it.each([
    ["past the left edge", { top: 100, left: -5, width: 100, height: 40 }],
    ["past the right edge", { top: 100, left: 1000, width: 100, height: 40 }],
    // Zero width but laid out: still a real place on the page.
    ["with no width, below the window", { top: 900, left: 0, width: 0, height: 40 }],
    ["with no height, below the window", { top: 900, left: 0, width: 100, height: 0 }],
  ])("scrolls to an opener %s", (_name, box) => {
    expect(place(box)).toBe(true);
  });

  it("focuses without an error where scrollIntoView does not exist", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    Object.defineProperty(button, "scrollIntoView", { value: undefined });
    expect(() => focusWithoutJump(button)).not.toThrow();
    expect(document.activeElement).toBe(button);
  });
});

describe("useDialogFocusReturn", () => {
  const closeEvent = () => new Event("close", { cancelable: true });
  const setUp = (returnFocusTo?: () => HTMLElement | null) =>
    renderHook(() => useDialogFocusReturn(returnFocusTo)).result.current;

  it("does not fail when the last pointer target has no focusable ancestor", () => {
    const handlers = setUp();
    const plain = document.createElement("div");
    document.body.appendChild(plain);
    fireEvent.pointerDown(plain);
    expect(() => handlers.onOpenAutoFocus()).not.toThrow();
  });

  it("takes over the close focus and lands on returnFocusTo when nothing was focused", () => {
    const target = document.createElement("button");
    document.body.appendChild(target);
    const plain = document.createElement("div");
    document.body.appendChild(plain);
    fireEvent.pointerDown(plain);
    const handlers = setUp(() => target);
    handlers.onOpenAutoFocus();
    const event = closeEvent();
    handlers.onCloseAutoFocus(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(target);
  });

  it("does not jump to the main landmark when there was never an opener", () => {
    const main = document.createElement("main");
    document.body.appendChild(main);
    const plain = document.createElement("div");
    document.body.appendChild(plain);
    fireEvent.pointerDown(plain);
    const handlers = setUp();
    handlers.onOpenAutoFocus();
    handlers.onCloseAutoFocus(closeEvent());
    expect(document.activeElement).not.toBe(main);
  });

  const openThenRemoveOpener = (handlers: ReturnType<typeof setUp>) => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    handlers.onOpenAutoFocus();
    opener.remove();
    (document.activeElement as HTMLElement | null)?.blur();
  };

  it("does not fail when the opener is gone and the page has no main landmark", () => {
    const handlers = setUp();
    openThenRemoveOpener(handlers);
    expect(() => handlers.onCloseAutoFocus(closeEvent())).not.toThrow();
  });

  it("focuses the main landmark without scrolling and keeps a tabindex it already had", () => {
    const main = document.createElement("main");
    main.setAttribute("tabindex", "0");
    document.body.appendChild(main);
    const focus = vi.spyOn(main, "focus");
    const handlers = setUp();
    openThenRemoveOpener(handlers);
    handlers.onCloseAutoFocus(closeEvent());
    expect(document.activeElement).toBe(main);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(main.getAttribute("tabindex")).toBe("0");
  });
});
