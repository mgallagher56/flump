import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import { HomeRoughFigures, roughFiguresMoment } from "./HomeRoughFigures";

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

  it("draws the line once by time, never scrubbed, and brings each step in as it arrives", () => {
    const { container } = render(<HomeRoughFigures />);
    const root = container.querySelector("[data-steps-picture]")?.parentElement as HTMLElement;
    const { kit, create, calls } = fakeKit();
    roughFiguresMoment(kit, root);

    const trigger = create.mock.calls[0]?.[0].scrollTrigger as Record<string, unknown>;
    expect(trigger.once).toBe(true);
    expect(trigger.scrub).toBeUndefined();

    const [line, ...rest] = calls;
    expect(line?.method).toBe("fromTo");
    // durations.marketing.chart is 2,660 ms.
    expect(line?.vars).toMatchObject({ scaleY: 1, duration: 2.66, ease: "calmInOut" });
    // Three steps a third of the draw apart (2.66 / 3 = 0.8867 s), then the picture after two
    // staggers (2 × 196 ms = 0.392 s).
    const at = rest.map((c) => Number(c.at).toFixed(3));
    expect(at).toEqual(["0.000", "0.887", "1.773", "0.392"]);
    expect(rest.every((c) => c.vars.duration === 1.54)).toBe(true);
  });
});
