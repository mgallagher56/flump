import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlumpLogo } from "./FlumpLogo";
import { floorLayout, LOGO_FLOOR, LOGO_ORBS, LOGO_VIEWBOX } from "./FlumpLogo.art";

describe("FlumpLogo primitive", () => {
  it("is decorative by default", () => {
    const { container } = render(<FlumpLogo />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("exposes a name when labelled", () => {
    render(<FlumpLogo label="Flump" />);
    expect(screen.getByRole("img", { name: "Flump" })).toBeDefined();
  });

  it("uses no raw colour: every paint is a logo token", () => {
    const { container } = render(<FlumpLogo />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(/);
    expect(container.innerHTML).not.toMatch(/stop-color=/);
    for (const stop of container.querySelectorAll("stop")) {
      expect(stop.getAttribute("class")).toMatch(/colors\.logo\.\w+/);
    }
  });

  // The approved drawing "K2" (owner, 27 Nov 2026): violet (108,54) r20 lit by rose and with no
  // glint, sky (140,92) r28 and teal (84,122) r48 lit by violet, teal drawn last, in front.
  it("draws the three approved bubbles, teal in front", () => {
    const { container } = render(<FlumpLogo />);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(LOGO_VIEWBOX);
    const bubbles = Array.from(container.querySelectorAll("g[data-tone]"));
    expect(bubbles.map((g) => g.getAttribute("data-tone"))).toEqual(["violet", "sky", "teal"]);
    expect(LOGO_ORBS.map(({ cx, cy, r, light, glint }) => [cx, cy, r, light, glint])).toEqual([
      [108, 54, 20, "rose", false],
      [140, 92, 28, "violet", true],
      [84, 122, 48, "violet", true],
    ]);
    bubbles.forEach((g, i) => {
      const circle = g.querySelector("circle");
      expect([
        circle?.getAttribute("cx"),
        circle?.getAttribute("cy"),
        circle?.getAttribute("r"),
      ]).toEqual([LOGO_ORBS[i]?.cx, LOGO_ORBS[i]?.cy, LOGO_ORBS[i]?.r].map(String));
      expect(g.querySelectorAll("ellipse")).toHaveLength(LOGO_ORBS[i]?.glint ? 1 : 0);
    });
  });

  // The owner rejected two shadows and one off-centre: one floor, under the bubbles.
  it("has one floor shadow, centred under the bubbles", () => {
    expect(LOGO_FLOOR).toEqual({ cx: 99, cy: 177, rx: 53 });
    const left = Math.min(...LOGO_ORBS.map((o) => o.cx - o.r));
    const right = Math.max(...LOGO_ORBS.map((o) => o.cx + o.r));
    expect(Math.abs(LOGO_FLOOR.cx - (left + right) / 2)).toBeLessThan(4);
    const { container } = render(<FlumpLogo />);
    const floors = Array.from(
      container.querySelectorAll("svg > ellipse, svg > g:not([data-tone]) > ellipse"),
    );
    // One light floor; in dark, one shadow drawn as a contact shade with a teal pool over it.
    expect(floors).toHaveLength(3);
    const { light, contact, pool } = floorLayout(LOGO_FLOOR);
    expect(floors.map((e) => e.getAttribute("cx"))).toEqual(
      [light.cx, contact.cx, pool.cx].map(String),
    );
  });

  it("gives each instance its own gradient ids", () => {
    const { container } = render(
      <>
        <FlumpLogo />
        <FlumpLogo />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("radialGradient")).map((g) => g.id);
    expect(ids).toHaveLength(2 * (2 + 3 * LOGO_ORBS.length));
    expect(new Set(ids).size).toBe(ids.length);
    const [first, second] = Array.from(container.querySelectorAll("svg"));
    for (const svg of [first, second]) {
      const own = new Set(
        Array.from(svg?.querySelectorAll("radialGradient") ?? []).map((g) => `url(#${g.id})`),
      );
      for (const el of svg?.querySelectorAll("[fill^='url']") ?? []) {
        expect(own.has(el.getAttribute("fill") ?? "")).toBe(true);
      }
    }
  });

  it("is static: no animation", () => {
    const { container } = render(<FlumpLogo />);
    expect(container.querySelector("animate, animateTransform, animateMotion, set")).toBeNull();
  });
});
