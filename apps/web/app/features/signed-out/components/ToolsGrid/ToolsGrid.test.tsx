import { TOOL_CATALOGUE, TOOL_SLUGS } from "@repo/ui/tools";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
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
    expect(items).toHaveLength(TOOL_CATALOGUE.length);
    const hrefs = items.map((item) => within(item).getByRole("link").getAttribute("href"));
    expect(hrefs).toEqual(TOOL_CATALOGUE.map((tool) => `/tools/${tool.slug}`));
  });

  it("leads with debt and lists the income above £100,000 tool last", () => {
    render(<ToolsGrid />);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(TOOL_CATALOGUE.map((t) => t.title));
    expect(TOOL_CATALOGUE[0]?.slug).toBe("uk-debt-snowball-vs-avalanche-calculator");
    expect(TOOL_CATALOGUE.at(-1)?.slug).toBe("uk-100k-tax-trap-calculator");
  });

  it("follows the shared catalogue order that marketing also reads (E31)", () => {
    expect(TOOL_CATALOGUE.map((t) => t.slug)).toEqual([...TOOL_SLUGS]);
    expect(TOOL_CATALOGUE.map((t) => t.slug)).toContain("uk-pay-rise-take-home-calculator");
  });
});
