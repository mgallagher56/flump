import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BUBBLE_LAYOUTS, BubbleField } from "./BubbleField";
import { BUBBLE_PLACES } from "./BubbleField.styles";

const sets = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-bubble-set]")).map((b) =>
    b.getAttribute("data-bubble-set"),
  );

describe("BubbleField", () => {
  it("is decoration only: hidden from assistive technology, with one bubble per layout entry", () => {
    const { container } = render(<BubbleField layout="b" />);
    const layer = container.querySelector("[data-bubble-field]");
    expect(layer?.getAttribute("aria-hidden")).toBe("true");
    expect(layer?.getAttribute("data-bubble-field")).toBe("b");
    expect(layer?.querySelectorAll("span")).toHaveLength(BUBBLE_LAYOUTS.b.length);
  });

  it("alternates the two orb sets by default, large bubble first in sky and teal", () => {
    const { container } = render(<BubbleField layout="a" />);
    expect(sets(container)).toEqual(["skyTeal", "violetRose", "skyTeal"]);
  });

  it("uses one set throughout when asked", () => {
    const { container } = render(<BubbleField layout="a" sets="violetRose" />);
    expect(sets(container)).toEqual(["violetRose", "violetRose", "violetRose"]);
  });

  it("keeps prototype 11's sizes, largest first, with a place for every bubble", () => {
    expect(BUBBLE_LAYOUTS.a.map((b) => b.size)).toEqual([260, 120, 70]);
    expect(BUBBLE_LAYOUTS.b.map((b) => b.size)).toEqual([300, 96, 54]);
    expect(BUBBLE_LAYOUTS.c.map((b) => b.size)).toEqual([180, 80]);
    for (const layout of ["a", "b", "c"] as const) {
      expect(BUBBLE_PLACES[layout]).toHaveLength(BUBBLE_LAYOUTS[layout].length);
    }
  });

  it("marks the size on each bubble, so the server HTML holds the still field", () => {
    const { container } = render(<BubbleField layout="c" />);
    expect(
      Array.from(container.querySelectorAll("[data-bubble-size]")).map((b) =>
        b.getAttribute("data-bubble-size"),
      ),
    ).toEqual(["180", "80"]);
  });
});
