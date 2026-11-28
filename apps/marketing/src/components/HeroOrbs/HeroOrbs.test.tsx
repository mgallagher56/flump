import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { orbPlace } from "../StillHeroOrbs/StillHeroOrbs.styles";
import { HeroOrbs } from "./HeroOrbs";

describe("HeroOrbs", () => {
  it("places four still glass orbs, one per slot, in the given colours, hidden from assistive technology", () => {
    render(<HeroOrbs tones={["violet", "teal", "sky", "teal"]} watchRef={createRef()} />);
    const stage = screen.getByTestId("hero-stage");
    expect(stage.getAttribute("aria-hidden")).toBe("true");
    const slots = [...stage.querySelectorAll<HTMLElement>("[data-hero-orb]")];
    expect(slots.map((slot) => slot.dataset.heroOrb)).toEqual(["0", "1", "2", "3"]);
    slots.forEach((slot, i) => {
      expect(slot.className).toContain(orbPlace({ slot: i as 0 | 1 | 2 | 3 }));
    });
    expect(
      slots.map((slot) => slot.querySelector("[data-glass-orb]")?.getAttribute("data-orb-tone")),
    ).toEqual(["violet", "teal", "sky", "teal"]);
    // The band's colour, for the live scene's backdrop.
    expect(stage.querySelector("[data-scene-swatch='canvas']")).not.toBeNull();
  });
});
