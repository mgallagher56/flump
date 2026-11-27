import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlassOrb, ORB_TONES } from "./GlassOrb";

describe("GlassOrb", () => {
  it.each(ORB_TONES)("draws a %s orb hidden from assistive technology", (tone) => {
    const { container } = render(<GlassOrb tone={tone} />);
    const orb = container.firstElementChild as HTMLElement;
    expect(orb.tagName).toBe("SPAN");
    expect(orb.getAttribute("aria-hidden")).toBe("true");
    expect(orb.getAttribute("data-orb-tone")).toBe(tone);
    expect(orb.textContent).toBe("");
  });

  it("offers the four orb colours, alternating the two sets", () => {
    expect(ORB_TONES).toEqual(["sky", "violet", "teal", "rose"]);
  });

  it("keeps the placing class alongside its own", () => {
    const { container } = render(<GlassOrb className="placed" size="lg" tone="rose" />);
    expect(container.firstElementChild?.classList.contains("placed")).toBe(true);
  });
});
