// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StillHeroOrbs } from "./StillHeroOrbs";
import { orbPlace } from "./StillHeroOrbs.styles";

const parse = (html: string) => {
  const slots = [...html.matchAll(/<span class="([^"]+)" data-hero-orb="(\d)">/g)];
  const tones = [...html.matchAll(/data-orb-tone="([a-z]+)"/g)].map((m) => m[1]);
  return { slots, tones };
};

describe("StillHeroOrbs", () => {
  it("server-renders four still glass orbs in the given colours, biggest first, one per slot", () => {
    const html = renderToString(<StillHeroOrbs tones={["sky", "violet", "teal", "rose"]} />);
    const { slots, tones } = parse(html);
    expect(slots.map((m) => m[2])).toEqual(["0", "1", "2", "3"]);
    slots.forEach((m, i) => {
      expect(m[1]).toContain(orbPlace({ slot: i as 0 | 1 | 2 | 3 }));
    });
    expect(tones).toEqual(["sky", "violet", "teal", "rose"]);
  });

  it("is a still, decorative stage: hidden from assistive technology, no canvas, marked still", () => {
    const html = renderToString(<StillHeroOrbs tones={["teal", "violet", "sky", "rose"]} />);
    expect(html.startsWith('<span aria-hidden="true"')).toBe(true);
    expect(html).toContain('data-scene="still"');
    expect(html).toContain('data-testid="hero-stage"');
    expect(html).not.toContain("<canvas");
  });
});
