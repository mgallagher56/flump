import { expectPageRules } from "@repo/ui/testing";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MONTHLY_PICTURE_ITEMS, MonthlyPictureSection } from "./MonthlyPictureSection";

const renderSection = () =>
  render(
    <MemoryRouter>
      <MonthlyPictureSection />
    </MemoryRouter>,
  );

describe("MonthlyPictureSection (What you can see)", () => {
  it("shows three cards, each with an icon tile, in a tinted band", () => {
    const { container } = renderSection();
    const section = screen.getByRole("region", { name: "What you can see" });
    expect(section.getAttribute("data-tone-band")).toBe("apricot");
    const items = within(screen.getByRole("list", { name: "What you can see" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(3);
    expect(container.querySelectorAll("[data-tile-tone]")).toHaveLength(3);
    expect(items.map((li) => li.querySelector("h3")?.textContent)).toEqual(
      MONTHLY_PICTURE_ITEMS.map((item) => item.title),
    );
  });

  it("shows no figures and treats renting and a mortgage the same", () => {
    const { container } = renderSection();
    expectPageRules(container, { maxFigures: 0, projectionNotices: 0 });
    expect(screen.getByText(/whether you rent or pay a mortgage/)).toBeDefined();
  });

  it("links to the calculators without calling them free", () => {
    renderSection();
    const link = screen.getByRole("link", { name: "Browse the calculators" });
    expect(link.getAttribute("href")).toBe("/tools");
    expect(link.textContent).not.toMatch(/free/i);
  });
});
