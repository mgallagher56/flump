import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import { closeMoment, HomeClose } from "./HomeClose";

vi.mock("../../motion/useGsapMoment", () => ({ useGsapMoment: vi.fn() }));
vi.mock("../../utils/site", () => ({
  signupCta: () => ({ href: "/contact#beta", label: "Request an invite", external: false }),
}));

describe("HomeClose", () => {
  it("asks the closing question on the calm canvas band (prototype 11), never a dark band", () => {
    const { container } = render(<HomeClose />);
    const band = container.querySelector("#get-started") as HTMLElement;
    expect(band.getAttribute("data-tone-band")).toBe("canvas");
    expect(band.getAttribute("data-home-section-name")).toBe("Get started");
    expect(screen.getByRole("region", { name: "Ready to see where you stand?" })).toBe(band);
    const card = within(band).getByTestId("home-final-cta");
    expect(within(card).getByText("Start with a few rough numbers.")).toBeDefined();
    const invite = within(card).getByRole("link", { name: "Request an invite" });
    expect(invite.getAttribute("href")).toBe("/contact#beta");
    expect(invite.getAttribute("data-variant")).toBe("primary");
  });

  it("shows prototype 10's gathered stack, its Example tags in real text, hidden from assistive technology", () => {
    render(<HomeClose />);
    const picture = screen.getByTestId("home-final-cta-picture");
    const stack = within(picture).getByTestId("close-stack");
    expect(stack.getAttribute("aria-hidden")).toBe("true");
    expect(stack.querySelectorAll("[data-close-piece]")).toHaveLength(6);
    expect(within(stack).getAllByText("Example", { exact: true })).toHaveLength(6);
    // The design system's onboarding picture is gone.
    expect(picture.querySelector("[data-scene='onboarding']")).toBeNull();
  });

  it("takes another picture in its slot", () => {
    render(<HomeClose picture={<p>Another picture</p>} />);
    const picture = screen.getByTestId("home-final-cta-picture");
    expect(within(picture).getByText("Another picture")).toBeDefined();
    expect(within(picture).queryByTestId("close-stack")).toBeNull();
  });

  it("brings the card in, then gathers the stack from prototype 10's places, once, by time", () => {
    render(<HomeClose />);
    const root = screen.getByTestId("home-final-cta").parentElement?.parentElement as HTMLElement;
    screen.getByTestId("close-stack").style.setProperty("--stack-scale", "0.5");
    const calls: [unknown, Record<string, unknown>][] = [];
    const timeline = {
      from: (target: unknown, vars: Record<string, unknown>) => {
        calls.push([target, vars]);
        return timeline;
      },
    };
    const create = vi.fn((_vars: Record<string, unknown>) => timeline);
    closeMoment({ gsap: { timeline: create } } as unknown as GsapKit, root);
    const vars = create.mock.calls[0]?.[0] as { scrollTrigger: Record<string, unknown> };
    expect(vars.scrollTrigger).toMatchObject({ once: true });
    expect(vars.scrollTrigger.scrub).toBeUndefined();
    expect(calls.map(([target]) => target)).toHaveLength(2);
    expect(calls[0]?.[0]).toBe(root);
    const pieces = [...((calls[1]?.[0] ?? []) as Iterable<Element>)];
    expect(pieces.map((piece) => piece.getAttribute("data-close-piece"))).toEqual([
      "statement",
      "payslip",
      "receipt",
      "pension",
      "credit",
      "card",
    ]);
    const gather = calls[1]?.[1] as {
      x: (i: number) => number;
      y: (i: number) => number;
      rotation: (i: number) => number;
      opacity: number;
    };
    // Prototype 10's screen offsets, in the layer's own pixels: -70px / 0.5 = -140, and so on.
    expect([0, 5].map(gather.x)).toEqual([-140, 68]);
    expect([0, 4].map(gather.y)).toEqual([-48, -60]);
    expect([0, 3].map(gather.rotation)).toEqual([-6, 6]);
    expect(gather.opacity).toBe(0);
  });

  it("lifts another picture in whole, with no gather", () => {
    render(<HomeClose picture={<p>Another picture</p>} />);
    const root = screen.getByTestId("home-final-cta").parentElement?.parentElement as HTMLElement;
    const targets: unknown[] = [];
    const timeline = {
      from: (target: unknown) => {
        targets.push(target);
        return timeline;
      },
    };
    closeMoment({ gsap: { timeline: () => timeline } } as unknown as GsapKit, root);
    expect(targets).toEqual([root, screen.getByTestId("home-final-cta-picture")]);
  });

  it("brings only the card in when there is no picture", () => {
    const root = document.createElement("div");
    const targets: unknown[] = [];
    const timeline = {
      from: (target: unknown) => {
        targets.push(target);
        return timeline;
      },
    };
    closeMoment({ gsap: { timeline: () => timeline } } as unknown as GsapKit, root);
    expect(targets).toEqual([root]);
  });
});
