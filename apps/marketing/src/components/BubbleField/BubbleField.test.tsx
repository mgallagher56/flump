import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BUBBLE_LAYOUTS, BubbleField } from "./BubbleField";

describe("BubbleField", () => {
  it("is decoration only: hidden from assistive technology, with one bubble per layout entry", () => {
    const { container } = render(<BubbleField layout="b" />);
    const layer = container.querySelector("[data-bubble-field]");
    expect(layer?.getAttribute("aria-hidden")).toBe("true");
    expect(layer?.getAttribute("data-bubble-field")).toBe("b");
    expect(layer?.querySelectorAll("span")).toHaveLength(BUBBLE_LAYOUTS.b.length);
  });

  it("mixes both orb sets in every layout and keeps large bubbles to the gutters, never the padding", () => {
    for (const layout of Object.values(BUBBLE_LAYOUTS)) {
      expect(new Set(layout.map((b) => b.set))).toEqual(new Set(["skyTeal", "violetRose"]));
      for (const b of layout) {
        const inPadding = b.edge === "top" || b.edge === "bottom";
        expect(inPadding, `${b.size} bubble at ${b.edge}`).toBe(b.size === "sm");
      }
    }
  });
});
