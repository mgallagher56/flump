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
  it("lists the four deeper tools, each linked to its area, on the canvas band", () => {
    renderDetail();
    const band = screen.getByRole("region", { name: "More detail when you want it" });
    expect(band.getAttribute("data-tone-band")).toBe("canvas");
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

  it("deals the items in once, in document order, by time", () => {
    renderDetail();
    const list = screen.getByRole("list");
    const from = vi.fn();
    moreDetailMoment({ gsap: { from } } as unknown as GsapKit, list);
    const [targets, vars] = from.mock.calls[0] as [Element[], Record<string, unknown>];
    expect(targets).toEqual(within(list).getAllByRole("listitem"));
    expect(vars).toMatchObject({ y: 12, opacity: 0, duration: 1.54, stagger: 0.196 });
    expect(vars.scrollTrigger).toMatchObject({ once: true });
    expect((vars.scrollTrigger as Record<string, unknown>).scrub).toBeUndefined();
  });
});
