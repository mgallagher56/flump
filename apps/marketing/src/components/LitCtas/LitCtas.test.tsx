import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LitCtas, pointerLightAt } from "./LitCtas";

const stubMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

const box = { left: 100, top: 50, width: 200, height: 40 };

const moveOver = (element: Element, pointerType: string) =>
  act(() => {
    element.dispatchEvent(
      new PointerEvent("pointermove", { pointerType, clientX: 250, clientY: 60, bubbles: true }),
    );
  });

afterEach(() => vi.unstubAllGlobals());

describe("pointerLightAt", () => {
  it("puts the light under the pointer and leans up to 2px across and 1.5px down", () => {
    // Pointer at (250, 60) in a box from (100, 50), 200 by 40: 150px and 10px in. Across, 150/200
    // is 0.75, so (0.75 - 0.5) x 4 = 1px; down, 10/40 is 0.25, so (0.25 - 0.5) x 3 = -0.75px.
    expect(pointerLightAt(250, 60, box)).toEqual({ lx: 150, ly: 10, tx: 1, ty: -0.75 });
    // The corners lean the most: (0 - 0.5) x 4 = -2 and (1 - 0.5) x 3 = 1.5.
    expect(pointerLightAt(100, 90, box)).toEqual({ lx: 0, ly: 40, tx: -2, ty: 1.5 });
  });

  it("does not lean in an empty box", () => {
    expect(pointerLightAt(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toMatchObject({
      tx: 0,
      ty: 0,
    });
  });
});

describe("LitCtas", () => {
  it("renders the sign-up call to action and the preview link, both lit", () => {
    stubMotion(false);
    render(<LitCtas />);
    const preview = screen.getByRole("link", { name: "Interactive preview" });
    expect(preview.getAttribute("href")).toBe("/preview");
    expect(preview.hasAttribute("data-light")).toBe(true);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getAllByRole("link").every((a) => a.hasAttribute("data-light"))).toBe(true);
  });

  it("leaves out the preview link when asked", () => {
    stubMotion(false);
    render(<LitCtas secondary={false} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Interactive preview" })).toBeNull();
  });

  it("writes the light under a mouse, once a frame, and settles the lean on leave", () => {
    stubMotion(false);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    render(<LitCtas />);
    const preview = screen.getByRole("link", { name: "Interactive preview" });
    preview.getBoundingClientRect = () => box as DOMRect;
    moveOver(preview, "mouse");
    moveOver(preview, "mouse");
    expect(frames).toHaveLength(1);
    act(() => frames[0]?.(0));
    expect(preview.style.getPropertyValue("--lx")).toBe("150px");
    expect(preview.style.getPropertyValue("--tx")).toBe("1px");
    act(() => {
      preview.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
    });
    expect(preview.style.getPropertyValue("--tx")).toBe("0px");
    expect(preview.style.getPropertyValue("--ty")).toBe("0px");
  });

  it("writes nothing for touch, or with reduced motion", () => {
    stubMotion(false);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    const { unmount } = render(<LitCtas />);
    moveOver(screen.getByRole("link", { name: "Interactive preview" }), "touch");
    expect(frames).toHaveLength(0);
    unmount();
    stubMotion(true);
    render(<LitCtas />);
    moveOver(screen.getByRole("link", { name: "Interactive preview" }), "mouse");
    expect(frames).toHaveLength(0);
  });
});
