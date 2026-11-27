import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import { HomeSecurity, securityMoment } from "./HomeSecurity";

vi.mock("../../motion/useGsapMoment", () => ({ useGsapMoment: vi.fn() }));

const renderSecurity = () =>
  render(
    <MemoryRouter>
      <HomeSecurity />
    </MemoryRouter>,
  );

describe("HomeSecurity", () => {
  it("is a glass card on the card band, never a solid band, linking to the security page", () => {
    renderSecurity();
    const band = screen.getByTestId("security-privacy-section");
    expect(band.getAttribute("data-tone-band")).toBe("card");
    expect(band.id).toBe("security");
    expect(screen.getByRole("region", { name: "Security and privacy" })).toBe(band);
    expect(band.getAttribute("data-home-section-name")).toBe("Security");
    expect(
      screen.getByRole("link", { name: "What Flump can and cannot do" }).getAttribute("href"),
    ).toBe("/security");
    const picture = band.querySelector("svg[data-variant=document]");
    expect(picture?.getAttribute("data-scene")).toBe("security");
    expect(picture?.getAttribute("aria-hidden")).toBe("true");
  });

  it("states today's facts and promises no bank connection", () => {
    renderSecurity();
    const text = screen.getByTestId("security-privacy-section").textContent ?? "";
    expect(text).toMatch(/no bank login is needed/);
    expect(text).toMatch(/no feature to make payments or move money/);
    expect(text).not.toMatch(/coming soon|bank connection|bank feed|engine|manual-first/i);
  });

  it("brings the card in once by time, then its four parts in turn", () => {
    renderSecurity();
    const card = screen.getByTestId("security-card");
    const calls: { target: unknown; vars: Record<string, unknown> }[] = [];
    const timeline = {
      from: (target: unknown, vars: Record<string, unknown>) => {
        calls.push({ target, vars });
        return timeline;
      },
    };
    const create = vi.fn((_vars: Record<string, unknown>) => timeline);
    securityMoment({ gsap: { timeline: create } } as unknown as GsapKit, card);
    const vars = create.mock.calls[0]?.[0] as {
      scrollTrigger: Record<string, unknown>;
      defaults: Record<string, unknown>;
    };
    expect(vars.scrollTrigger).toMatchObject({ once: true });
    expect(vars.scrollTrigger.scrub).toBeUndefined();
    expect(vars.defaults).toMatchObject({ ease: "calm", duration: 1.54 });
    expect((calls[1]?.target as NodeList | undefined)?.length).toBe(4);
    expect(calls[1]?.vars.stagger).toBe(0.196);
  });
});
