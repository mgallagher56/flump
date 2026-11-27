import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../context/ThemeContext";
import { MONEY_AREAS, type MoneyArea } from "../../utils/featureAreas";
import { AreaPage } from "./AreaPage";

const renderArea = (area: MoneyArea) =>
  render(
    <HelmetProvider>
      <ThemeProvider>
        <MemoryRouter initialEntries={[area.path]}>
          <AreaPage feature={area} />
        </MemoryRouter>
      </ThemeProvider>
    </HelmetProvider>,
  );

const main = () => screen.getByRole("main");

describe.each(MONEY_AREAS.map((area) => [area.name, area] as const))("AreaPage: %s", (_, area) => {
  it("leads with the area name, the h1, the lead and two calls to action", () => {
    renderArea(area);
    const heroBlock = screen.getByTestId("feature-hero");
    // The area's name as a small label, left out where it would only repeat the h1 (the approved
    // Debt and borrowing prototype).
    const label = within(heroBlock).queryByText(area.name, { selector: "p" });
    if (area.name === area.h1) expect(label).toBeNull();
    else expect(label).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: area.h1 })).toBeDefined();
    expect(within(heroBlock).getByText(area.lead)).toBeDefined();
    const invite = within(heroBlock).getByRole("link", { name: "Request an invite" });
    expect(invite.getAttribute("href")).toBe("/contact#beta");
    expect(
      within(heroBlock).getByRole("link", { name: "Interactive preview" }).getAttribute("href"),
    ).toBe(area.previewHref);
    expectPageRules(heroBlock, { projectionNotices: 0 });
    expectPageRules(screen.getByTestId("feature-final-cta"), { projectionNotices: 0 });
  });

  it("shows three facts, the deeper tools, then the five areas with this one marked", () => {
    renderArea(area);
    const headings = within(main())
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toContain("What you see");
    expect(headings.indexOf("What you see")).toBeLessThan(
      headings.indexOf("More detail when you want it"),
    );
    expect(headings.indexOf("More detail when you want it")).toBeLessThan(
      headings.indexOf("Part of one picture"),
    );
    for (const fact of area.facts) expect(screen.getByText(fact)).toBeDefined();
    for (const item of area.depth) expect(screen.getByText(item)).toBeDefined();
    const strip = screen.getByTestId("area-strip");
    expect(within(strip).getByRole("link", { current: "page" }).getAttribute("href")).toBe(
      area.path,
    );
  });

  it("links to no calculator page and no old address", () => {
    const { container } = renderArea(area);
    expect(container.querySelector('a[href^="/mcp"], a[href^="/tools"]')).toBeNull();
    expect(within(main()).queryByRole("link", { name: /read more/i })).toBeNull();
  });
});

describe("AreaPage samples (D6)", () => {
  const byKey = (key: MoneyArea["key"]) => MONEY_AREAS.find((a) => a.key === key) as MoneyArea;

  it("shows the sample dashboard on Accounts and breathing room on Budget", () => {
    const { unmount } = renderArea(byKey("accounts"));
    expect(document.getElementById("feature-dashboard-preview")).not.toBeNull();
    unmount();
    renderArea(byKey("budget"));
    expect(document.getElementById("feature-breathing-room-preview")).not.toBeNull();
  });

  it("puts the kept calculators on Pay and on Debt and borrowing only, after the area strip (D9)", () => {
    for (const area of MONEY_AREAS) {
      const { unmount } = renderArea(area);
      const headings = within(main())
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent);
      const tryIt = headings.indexOf("Try it with your own numbers");
      if (area.key === "pay" || area.key === "debt-and-borrowing") {
        expect(tryIt, area.key).toBeGreaterThan(headings.indexOf("Part of one picture"));
      } else {
        expect(tryIt, area.key).toBe(-1);
      }
      unmount();
    }
  });

  it("adds the Retirement plan to Savings and pension, with the MoneyHelper line word for word (D10)", () => {
    renderArea(byKey("savings-and-pension"));
    const section = screen.getByRole("region", { name: "Retirement plan" });
    expect(within(section).getByText(/^Set a retirement target of your own\./)).toBeDefined();
    expect(section.textContent).toContain(
      "MoneyHelper offers free, impartial guidance on pensions, backed by the government.",
    );
    expect(
      within(section).getByRole("link", { name: /Pension guidance from MoneyHelper/ }),
    ).toBeDefined();
    expect(section.textContent).not.toMatch(/forecast|will have|should/i);
  });

  it("carries the MoneyHelper debt line on Debt and borrowing only (D10)", () => {
    const { unmount } = renderArea(byKey("debt-and-borrowing"));
    expect(screen.getByRole("complementary", { name: "Debt advice" }).textContent).toContain(
      "Free, impartial debt help is available from",
    );
    unmount();
    renderArea(byKey("budget"));
    expect(screen.queryByRole("complementary", { name: "Debt advice" })).toBeNull();
  });

  it.each([
    ["savings-and-pension", "feature-savings-pension-preview"],
    ["debt-and-borrowing", "feature-debt-borrowing-preview"],
  ] as const)("shows its own sample preview on %s (S8), with the household switch", (key, id) => {
    renderArea(byKey(key));
    expect(screen.getByRole("heading", { name: "See it with sample figures" })).toBeDefined();
    expect(document.getElementById(id)).not.toBeNull();
    const homeowner = screen.getByRole("button", { name: "Paying a mortgage" });
    fireEvent.click(homeowner);
    expect(homeowner.getAttribute("aria-pressed")).toBe("true");
  });

  // The approved Pay and Debt and borrowing prototypes: bands alternate card and canvas after the
  // canvas hero, a band with figures (the sample, the calculators) stays on the canvas, and the
  // close is a card band (after "Try it", or the other tone from the band before it). Worked by
  // hand from each page's band order:
  //   Accounts, Budget: what-you-see card, see-it canvas, more-detail card, one-picture canvas, close card
  //   Pay (no sample): what-you-see card, more-detail canvas, one-picture card, try-it canvas, close card
  //   Savings and pension: card, see-it canvas, retirement card, more-detail canvas, one-picture card, close canvas
  //   Debt and borrowing: card, see-it canvas, more-detail card, one-picture canvas, try-it canvas, close card
  it.each([
    ["accounts", ["card", "canvas", "card", "canvas", "card"]],
    ["budget", ["card", "canvas", "card", "canvas", "card"]],
    ["pay", ["card", "canvas", "card", "canvas", "card"]],
    ["savings-and-pension", ["card", "canvas", "card", "canvas", "card", "canvas"]],
    ["debt-and-borrowing", ["card", "canvas", "card", "canvas", "canvas", "card"]],
  ])("alternates the band tones on %s", (key, tones) => {
    const area = MONEY_AREAS.find((a) => a.key === key) as MoneyArea;
    const { container } = renderArea(area);
    const bands = [...container.querySelectorAll("main > [data-tone-band]")];
    expect(bands.map((band) => band.getAttribute("data-tone-band"))).toEqual(tones);
    for (const id of ["see-it", "try-it"]) {
      const band = container.querySelector(`#${id}`);
      if (band) expect(band.getAttribute("data-tone-band")).toBe("canvas");
    }
  });

  it("shows a sample on every area page, so no page needs a stand-in scene", () => {
    for (const area of MONEY_AREAS) {
      const { unmount } = renderArea(area);
      if (area.key !== "pay") {
        expect(screen.getByRole("heading", { name: "See it with sample figures" })).toBeDefined();
      }
      unmount();
    }
  });
});
