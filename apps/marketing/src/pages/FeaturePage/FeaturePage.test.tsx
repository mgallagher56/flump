import { expectPageRules } from "@repo/ui/testing";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../context/ThemeContext";
import { MONEY_AREAS, type MoneyArea } from "../../utils/featureAreas";
import { FeaturePage } from "./FeaturePage";

const renderArea = (area: MoneyArea) =>
  render(
    <HelmetProvider>
      <ThemeProvider>
        <MemoryRouter initialEntries={[area.path]}>
          <FeaturePage feature={area} />
        </MemoryRouter>
      </ThemeProvider>
    </HelmetProvider>,
  );

const main = () => screen.getByRole("main");

describe.each(MONEY_AREAS.map((area) => [area.name, area] as const))(
  "FeaturePage: %s",
  (_, area) => {
    it("leads with the area name, the h1, the lead and two calls to action", () => {
      renderArea(area);
      const heroBlock = screen.getByTestId("feature-hero");
      expect(within(heroBlock).getByText(area.name, { selector: "p" })).toBeDefined();
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
      expect(container.querySelector('a[href^="/mcp"]')).toBeNull();
      expect(within(main()).queryByRole("link", { name: /read more/i })).toBeNull();
    });
  },
);

describe("FeaturePage samples (D6)", () => {
  const byKey = (key: MoneyArea["key"]) => MONEY_AREAS.find((a) => a.key === key) as MoneyArea;

  it("shows the sample dashboard on Accounts and breathing room on Budget", () => {
    const { unmount } = renderArea(byKey("accounts"));
    expect(document.getElementById("feature-dashboard-preview")).not.toBeNull();
    unmount();
    renderArea(byKey("budget"));
    expect(document.getElementById("feature-breathing-room-preview")).not.toBeNull();
  });

  it("embeds the two-slider pay rise tool on Pay", () => {
    renderArea(byKey("pay"));
    expect(screen.getByRole("heading", { name: "What you keep from a pay rise" })).toBeDefined();
    expect(screen.queryByTestId("feature-illustration")).toBeNull();
  });

  it.each(["savings-and-pension", "debt-and-borrowing"] as const)(
    "shows a scene and no sample on %s",
    (key) => {
      renderArea(byKey(key));
      expect(screen.getByTestId("feature-illustration")).toBeDefined();
      expect(screen.queryByRole("heading", { name: "See it with sample figures" })).toBeNull();
    },
  );
});
