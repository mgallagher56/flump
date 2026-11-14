import { expectPageRules } from "@repo/ui/testing";
import { TOOL_CATALOGUE, TOOLS_INDEX_DESCRIPTION, TOOLS_INDEX_TITLE } from "@repo/ui/tools";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CANONICAL_TOOL_SLUGS } from "../../utils/toolSlugs";
import { ToolsIndexPage } from "./ToolsIndexPage";

const renderIndex = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ToolsIndexPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("ToolsIndexPage (E31, E16 PR 11)", () => {
  it("lists every tool once, in the canonical order, with equal weight", () => {
    renderIndex();
    const list = screen.getByRole("list", { name: "Calculators" });
    const hrefs = within(list)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(CANONICAL_TOOL_SLUGS.map((s) => `/tools/${s}`));
  });

  it("shows the shared catalogue titles and lines in catalogue order, as the web index does", () => {
    renderIndex();
    const list = screen.getByRole("list", { name: "Calculators" });
    const titles = within(list)
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(titles).toEqual(TOOL_CATALOGUE.map((t) => t.title));
    for (const tool of TOOL_CATALOGUE)
      expect(within(list).getByText(tool.description)).toBeTruthy();
    expect(titles.at(-1)).toBe("Pension contributions and income above £100,000");
  });

  it("has the beta h1 and one line, with no eyebrow, badge or notice", () => {
    const { container } = renderIndex();
    expect(screen.getByRole("heading", { level: 1, name: TOOLS_INDEX_TITLE })).toBeTruthy();
    expect(screen.getByText(TOOLS_INDEX_DESCRIPTION)).toBeTruthy();
    expect(screen.queryByText(/Public tools directory/)).toBeNull();
    expect(container.querySelectorAll('[role="note"]')).toHaveLength(0);
    expectPageRules(container, { projectionNotices: 0 });
    expect(container.textContent).not.toMatch(
      /ENGINE|Mathematically|guaranteed|\bsyncs\b|\bmonitors\b|tax trap/i,
    );
  });

  it("draws each icon in a domain IconTile", () => {
    const { container } = renderIndex();
    const domains = Array.from(container.querySelectorAll("ul [data-domain]")).map((el) =>
      el.getAttribute("data-domain"),
    );
    expect(domains).toEqual(TOOL_CATALOGUE.map((t) => t.domain));
  });
});
