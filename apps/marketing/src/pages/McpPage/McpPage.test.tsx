import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AI_STAGING_SENTENCE } from "../../utils/aiConnection";
import { EXAMPLE_QUESTIONS, McpPage } from "./McpPage";
import { MCP_TOOLS } from "./mcpTools";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <McpPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

/** Tool names registered by `packages/mcp`, read from its source (the single source of truth). */
const registeredToolNames = (): string[] => {
  const toolsDir = resolve(__dirname, "../../../../../packages/mcp/src/tools");
  const names: string[] = [];
  for (const group of ["read", "simulate", "write"]) {
    for (const file of readdirSync(join(toolsDir, group))) {
      if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
      const source = readFileSync(join(toolsDir, group, file), "utf8");
      if (!source.includes("defineFlumpTool")) continue;
      for (const m of source.matchAll(/^\s{2}name: "([a-z_]+)",$/gm)) names.push(m[1] as string);
    }
  }
  return names.sort();
};

describe("Marketing McpPage (E16 PR 12)", () => {
  it("leads with two plain sentences and a 'Request an invite' primary button", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Ask an AI assistant about your figures" }),
    ).toBeDefined();
    expect(screen.getByTestId("mcp-preview-badge").textContent).toMatch(/preview/i);
    const main = screen.getByRole("main");
    const invites = within(main).getAllByRole("link", { name: "Request an invite" });
    expect(invites[0]?.getAttribute("href")).toBe("/contact#beta");
    expect(invites[0]?.getAttribute("data-variant")).toBe("primary");
    expect(invites).toHaveLength(1);
    expect(screen.getByText(/^The AI connection links an AI assistant/)).toBeDefined();
    // Developer words wait behind "Show technical details" (R2-10).
    expect(within(main).getByRole("heading", { level: 1 }).parentElement?.textContent).not.toMatch(
      /Model Context Protocol|Claude Desktop|Cursor/,
    );
    expect(within(main).queryByText(/Open your profile/)).toBeNull();
    expectPageRules(main, { projectionNotices: 0 });
  });

  it("shows three example questions and how to turn it on", () => {
    renderPage();
    for (const q of EXAMPLE_QUESTIONS) expect(screen.getByText(q)).toBeDefined();
    // Plain question cards: no repeated decorative icon.
    expect(screen.getByRole("main").querySelectorAll("li [data-tile-tone]")).toHaveLength(0);
    expect(EXAMPLE_QUESTIONS).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 2, name: "How to turn it on" })).toBeDefined();
    expect(screen.getByText(/you can revoke it any time/)).toBeDefined();
    const main = screen.getByRole("main").textContent ?? "";
    expect(main).not.toMatch(/source code/);
    expect(main).not.toMatch(/coming soon/i);
    expect(main).toMatch(/Request an invite and sign in to Flump\./);
  });

  it("keeps the technical details collapsed until asked", () => {
    renderPage();
    expect(screen.queryByTestId("mcp-technical-details")).toBeNull();
    expect(screen.queryByText("get_financial_snapshot")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Show technical details" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByTestId("mcp-technical-details")).toBeDefined();
    expect(screen.getByText(/Institution names are replaced with generic labels/)).toBeDefined();
    expect(screen.getByText(/short for Model Context Protocol/)).toBeDefined();
    expect(screen.getByText(/runs from source code, with no installer/)).toBeDefined();
    expect(document.body.textContent).toContain("Flump MCP tools have no payment feature");
  });

  it("lists exactly the tools packages/mcp registers, with the right count", () => {
    const registered = registeredToolNames();
    expect(registered.length).toBeGreaterThanOrEqual(10);
    expect(MCP_TOOLS.map((t) => t.name).sort()).toEqual(registered);

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Show technical details" }));
    for (const tool of MCP_TOOLS) expect(screen.getByTestId(`mcp-tool-${tool.name}`)).toBeDefined();
    const readOrCalculate = MCP_TOOLS.filter((t) => t.kind !== "stage").length;
    const staging = MCP_TOOLS.filter((t) => t.kind === "stage").length;
    expect(screen.getByText(`${readOrCalculate} tools that read or calculate`)).toBeDefined();
    expect(screen.getByText(`${staging} staging tools, off by default`)).toBeDefined();
  });

  it("uses the shared staging sentence (#661 meaning) and makes no claim it cannot support", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Show technical details" }));
    const text = screen.getByRole("main").textContent ?? "";
    expect(text).toContain(AI_STAGING_SENTENCE);
    expect(text).not.toMatch(/should I|reclaim|escape|optimal|save tax|sample data/i);
    expect(text).not.toMatch(/never move money|strict|oauth-protected-resource|OAuth 2\.1/i);
    expect(text).not.toMatch(
      /PII-scrubbed|ChatGPT|zero hallucinations|No credit card|free read-only/i,
    );
    expect(text).not.toMatch(/deterministic|token-bucket|guardrail|runaway|amortisation/i);
    expect(screen.queryByText(/npx/)).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("uses monospace only on code samples and no all-caps text", () => {
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Show technical details" }));
    const main = container.querySelector("main") as HTMLElement;
    for (const el of Array.from(main.querySelectorAll("*"))) {
      if (el.className && /mono/.test(String(el.className))) expect(el.tagName).toBe("CODE");
    }
    expect(main.innerHTML).not.toMatch(/uppercase/);
  });
});
