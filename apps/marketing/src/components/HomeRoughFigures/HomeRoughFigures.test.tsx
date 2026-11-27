import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import { HomeRoughFigures, roughFiguresMoment, SCROLL_LAG } from "./HomeRoughFigures";

vi.mock("../../motion/useGsapMoment", () => ({ useGsapMoment: vi.fn() }));

/** A stand-in for GSAP that records the timeline it is asked to build. */
function fakeKit() {
  const calls: { method: string; target: unknown; vars: Record<string, unknown>; at?: unknown }[] =
    [];
  const timeline = {
    fromTo: (target: unknown, _from: unknown, vars: Record<string, unknown>, at: unknown) => {
      calls.push({ method: "fromTo", target, vars, at });
      return timeline;
    },
    from: (target: unknown, vars: Record<string, unknown>, at: unknown) => {
      calls.push({ method: "from", target, vars, at });
      return timeline;
    },
  };
  const create = vi.fn((_vars: Record<string, unknown>) => timeline);
  return { kit: { gsap: { timeline: create } } as unknown as GsapKit, create, calls };
}

describe("HomeRoughFigures", () => {
  it("renders the three steps in order, with the line drawn complete and the calendar page", () => {
    render(<HomeRoughFigures />);
    const band = within(screen.getByRole("region", { name: "Start with rough figures" }));
    expect(band.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Enter rough figures",
      "See where you stand",
      "Check in once a month",
    ]);
    const picture = screen.getByTestId("rough-figures-illustration").querySelector("svg");
    expect(picture?.getAttribute("data-scene")).toBe("check-in");
    expect(picture?.getAttribute("data-variant")).toBe("document");
    // No inline style: the line is at full length in the server HTML.
    expect(document.querySelector("[data-steps-line]")?.getAttribute("style")).toBeNull();
  });

  it("is the band's stop, named Rough figures", () => {
    render(<HomeRoughFigures />);
    const band = screen.getByRole("region", { name: "Start with rough figures" });
    expect(band.getAttribute("data-home-section-name")).toBe("Rough figures");
    expect(band.id).toBe("rough-figures");
  });

  it("ties the line, the circles and the calendar page to scroll, as prototype 11", () => {
    const { container } = render(<HomeRoughFigures />);
    const root = container.querySelector("[data-steps-picture]")?.parentElement as HTMLElement;
    const { kit, create, calls } = fakeKit();
    vi.stubGlobal("innerHeight", 1000);
    roughFiguresMoment(kit, root);

    // Two scroll-linked timelines: the steps, then the picture.
    expect(create).toHaveBeenCalledTimes(2);
    const steps = create.mock.calls[0]?.[0].scrollTrigger as Record<string, unknown>;
    expect(steps.scrub).toBe(SCROLL_LAG);
    expect(steps.once).toBeUndefined();
    // 0.55 x 1.4 (pace) x 1.4 (steps) screens of 1000px = 1078.
    expect((steps.end as () => string)()).toBe("+=1078");
    const picture = create.mock.calls[1]?.[0].scrollTrigger as Record<string, unknown>;
    // 0.55 x 1.4 (pace) x 1.6 (calendar) screens of 1000px = 1232.
    expect((picture.end as () => string)()).toBe("+=1232");

    const [line, ...rest] = calls;
    expect(line?.vars).toMatchObject({ scaleY: 1, duration: 3 });
    // Each step: its circle fills, then the step settles, 1.1 units apart.
    const lit = rest.filter((c) => (c.vars as Record<string, unknown>)["--lit"] === 1);
    expect(lit.map((c) => c.at)).toEqual([0, 1.1, 2.2]);
    const settle = rest.filter((c) => c.vars.x === 0);
    expect(settle).toHaveLength(3);
    const rise = rest.at(-1);
    expect(rise?.vars).toMatchObject({ y: 0, opacity: 1 });
    vi.unstubAllGlobals();
  });
});
