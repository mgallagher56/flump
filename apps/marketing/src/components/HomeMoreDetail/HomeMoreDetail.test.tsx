import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import { HomeMoreDetail, moreDetailMoment } from "./HomeMoreDetail";

vi.mock("../../motion/useGsapMoment", () => ({ useGsapMoment: vi.fn() }));

const renderDetail = () =>
  render(
    <MemoryRouter>
      <HomeMoreDetail />
    </MemoryRouter>,
  );

describe("HomeMoreDetail", () => {
  it("lists the four deeper tools, each linked to its area, on the card band (prototype 11)", () => {
    renderDetail();
    const band = screen.getByRole("region", { name: "More detail when you want it" });
    expect(band.getAttribute("data-tone-band")).toBe("card");
    expect(band.getAttribute("data-home-section-name")).toBe("More detail");
    expect(
      within(band)
        .getAllByRole("link")
        .map((a) => [a.textContent, a.getAttribute("href")]),
    ).toEqual([
      ["About pay in Flump", "/features/pay"],
      ["About savings and pension in Flump", "/features/savings-and-pension"],
      ["About debt and borrowing in Flump", "/features/debt-and-borrowing"],
      ["About accounts in Flump", "/features/accounts"],
    ]);
  });

  it("unstacks the cards once, in document order, by time: each card moves, not its tilting item", () => {
    renderDetail();
    const list = screen.getByRole("list");
    const tl = {
      to: vi.fn(() => tl),
      duration: vi.fn(() => 0.86),
      timeScale: vi.fn(),
      eventCallback: vi.fn(),
    };
    const set = vi.fn();
    const create = vi.fn();
    const kit = { gsap: { timeline: vi.fn(() => tl), set }, ScrollTrigger: { create } };
    moreDetailMoment(kit as unknown as GsapKit, list);
    const [targets] = set.mock.calls[0] as unknown as [Element[]];
    const items = within(list).getAllByRole("listitem");
    expect(targets.length).toBe(4);
    expect(targets.every((card, i) => card.parentElement === items[i])).toBe(true);
    const trigger = (create.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(trigger).toMatchObject({ once: true });
    expect(trigger.scrub).toBeUndefined();
  });
});
