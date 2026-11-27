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

  it("shows the getting started ticket, hidden from assistive technology", () => {
    render(<HomeClose />);
    const svg = screen.getByTestId("home-final-cta-illustration").querySelector("svg");
    expect(svg?.getAttribute("data-scene")).toBe("onboarding");
    expect(svg?.getAttribute("data-variant")).toBe("document");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("brings the card and then the ticket in once, by time", () => {
    render(<HomeClose />);
    const root = screen.getByTestId("home-final-cta").parentElement?.parentElement as HTMLElement;
    const targets: unknown[] = [];
    const timeline = {
      from: (target: unknown) => {
        targets.push(target);
        return timeline;
      },
    };
    const create = vi.fn((_vars: Record<string, unknown>) => timeline);
    closeMoment({ gsap: { timeline: create } } as unknown as GsapKit, root);
    const vars = create.mock.calls[0]?.[0] as { scrollTrigger: Record<string, unknown> };
    expect(vars.scrollTrigger).toMatchObject({ once: true });
    expect(vars.scrollTrigger.scrub).toBeUndefined();
    expect(targets).toEqual([root, screen.getByTestId("home-final-cta-illustration")]);
  });
});
