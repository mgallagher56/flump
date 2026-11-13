import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CANONICAL_TOOL_SLUGS } from "../utils/toolSlugs";
import { TOOLS_CATALOG, ToolsIndexPage } from "./ToolsIndexPage";

const renderIndex = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ToolsIndexPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("ToolsIndexPage (E31)", () => {
  it("lists every tool once, in the canonical order, with equal weight", () => {
    renderIndex();
    const list = screen.getByRole("list", { name: "UK calculators" });
    const hrefs = within(list)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(CANONICAL_TOOL_SLUGS.map((s) => `/tools/${s}`));
    expect(TOOLS_CATALOG.map((t) => t.slug)).toEqual([...CANONICAL_TOOL_SLUGS]);
  });

  it("keeps the £100k tax trap calculator as an ordinary card, not a spotlight", () => {
    renderIndex();
    const list = screen.getByRole("list", { name: "UK calculators" });
    expect(
      within(list).getByRole("heading", { name: "£100k–£125k tax trap and childcare calculator" }),
    ).toBeDefined();
    expect(screen.queryByText(/60% Peak Zone|Run £100k tax trap simulation/)).toBeNull();
    expect(CANONICAL_TOOL_SLUGS[0]).not.toBe("uk-100k-tax-trap-calculator");
  });
});
