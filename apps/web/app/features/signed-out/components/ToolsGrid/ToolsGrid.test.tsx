import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TOOL_TILES } from "../../toolsCatalog";
import { ToolsGrid } from "./ToolsGrid";

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("ToolsGrid", () => {
  it("lists every catalogue tool in order with the same markup", () => {
    render(<ToolsGrid />);
    const items = within(screen.getByRole("list", { name: "Calculators" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(TOOL_TILES.length);
    const hrefs = items.map((item) => within(item).getByRole("link").getAttribute("href"));
    expect(hrefs).toEqual(TOOL_TILES.map((tool) => `/tools/${tool.slug}`));
  });

  it("leads with debt and mortgage and does not lead with the £100k tool", () => {
    expect(TOOL_TILES[0]?.slug).toBe("uk-debt-snowball-vs-avalanche-calculator");
    expect(TOOL_TILES.findIndex((t) => t.slug === "mortgage-overpay-vs-isa")).toBeLessThan(
      TOOL_TILES.findIndex((t) => t.slug === "uk-100k-tax-trap-calculator"),
    );
  });

  it("follows marketing's CANONICAL_TOOL_SLUGS order (E31; web uses shorter slugs for three)", () => {
    expect(TOOL_TILES.map((t) => t.slug)).toEqual([
      "uk-debt-snowball-vs-avalanche-calculator",
      "0-percent-balance-transfer-payoff-calculator",
      "overdraft-cost-and-payoff-calculator",
      "mortgage-overpay-vs-isa",
      "uk-student-loan-overpay-or-invest-calculator",
      "uk-100k-tax-trap-calculator",
      "section-24-landlord-calculator",
    ]);
  });
});
