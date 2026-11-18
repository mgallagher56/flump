import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  KEYBOARD_INSET_VAR,
  measureKeyboard,
  useVisualViewportInset,
  VISUAL_VIEWPORT_HEIGHT_VAR,
} from "./useVisualViewportInset";

/** A stand-in for `window.visualViewport`: jsdom has none. */
class FakeViewport extends EventTarget {
  height = 812;
  offsetTop = 0;
}

const root = document.documentElement;
const read = (name: string) => root.style.getPropertyValue(name);

describe("measureKeyboard", () => {
  it("is zero with no keyboard", () => {
    // 812 tall page, 812 visible, not panned: nothing covered.
    expect(measureKeyboard(812, { height: 812, offsetTop: 0 })).toEqual({ height: 812, inset: 0 });
  });

  it("is the part of the page under the keyboard", () => {
    // A 336px keyboard leaves 476 visible: 812 - 476 - 0 = 336.
    expect(measureKeyboard(812, { height: 476, offsetTop: 0 })).toEqual({
      height: 476,
      inset: 336,
    });
  });

  it("counts a page the browser has panned up", () => {
    // Panned 120px: the visible part ends at 120 + 476 = 596, so 812 - 596 = 216 is covered.
    expect(measureKeyboard(812, { height: 476, offsetTop: 120 })).toEqual({
      height: 476,
      inset: 216,
    });
  });

  it("never goes below zero", () => {
    // Rounding or a toolbar can make the visible part a pixel taller than the page.
    expect(measureKeyboard(812, { height: 813, offsetTop: 0 }).inset).toBe(0);
  });
});

describe("useVisualViewportInset", () => {
  let viewport: FakeViewport;

  beforeEach(() => {
    viewport = new FakeViewport();
    vi.stubGlobal("visualViewport", viewport);
    vi.spyOn(root, "clientHeight", "get").mockReturnValue(812);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sets nothing while closed", () => {
    renderHook(() => useVisualViewportInset(false));
    expect(read(KEYBOARD_INSET_VAR)).toBe("");
  });

  it("publishes the visible height and the keyboard inset while open, and follows the keyboard", () => {
    const { unmount } = renderHook(() => useVisualViewportInset(true));
    expect(read(VISUAL_VIEWPORT_HEIGHT_VAR)).toBe("812px");
    expect(read(KEYBOARD_INSET_VAR)).toBe("0px");

    // The keyboard opens: 812 - 476 = 336 covered.
    act(() => {
      viewport.height = 476;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(read(VISUAL_VIEWPORT_HEIGHT_VAR)).toBe("476px");
    expect(read(KEYBOARD_INSET_VAR)).toBe("336px");

    unmount();
    expect(read(VISUAL_VIEWPORT_HEIGHT_VAR)).toBe("");
    expect(read(KEYBOARD_INSET_VAR)).toBe("");
  });

  it("keeps the variables until the last of two open modals closes", () => {
    const first = renderHook(() => useVisualViewportInset(true));
    const second = renderHook(() => useVisualViewportInset(true));
    first.unmount();
    expect(read(KEYBOARD_INSET_VAR)).toBe("0px");
    second.unmount();
    expect(read(KEYBOARD_INSET_VAR)).toBe("");
  });
});
