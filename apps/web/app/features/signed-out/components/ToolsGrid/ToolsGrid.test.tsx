import { TOOL_SLUGS } from "@repo/ui/tools";
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
    expect(
      TOOL_TILES.findIndex((t) => t.slug === "mortgage-overpayment-vs-isa-calculator"),
    ).toBeLessThan(TOOL_TILES.findIndex((t) => t.slug === "uk-100k-tax-trap-calculator"));
  });

  it("follows the shared catalogue order that marketing also reads (E31)", () => {
    expect(TOOL_TILES.map((t) => t.slug)).toEqual([...TOOL_SLUGS]);
    expect(TOOL_TILES.map((t) => t.slug)).toContain("uk-pay-rise-take-home-calculator");
  });
});
