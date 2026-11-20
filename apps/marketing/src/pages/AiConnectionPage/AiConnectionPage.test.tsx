import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AI_STAGING_SENTENCE } from "../../utils/aiConnection";
import { AiConnectionPage, EXAMPLE_QUESTIONS } from "./AiConnectionPage";
import { MCP_TOOLS } from "./mcpTools";

const renderPage = (path = "/features/ai-connection") =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <AiConnectionPage />
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

describe("Marketing AI connection page (E42 S2b)", () => {
  it("is a feature page: name, h1, lead, how a tester gets it, and two calls to action", () => {
    renderPage();
    const hero = screen.getByTestId("feature-hero");
    expect(screen.getByRole("heading", { level: 1, name: "AI connection" })).toBeDefined();
    expect(
      within(hero).getByText("Ask an AI assistant about the figures you have saved in Flump."),
    ).toBeDefined();
    // The decided tile wording: true for a tester whose account is not switched on (D5).
    expect(
      within(hero).getByText("Switched on for an account on request during testing."),
    ).toBeDefined();
    // Kept until the owner rules on it (plan section 7.1).
    expect(screen.getByTestId("mcp-preview-badge").textContent).toMatch(/preview/i);
    const invite = within(hero).getByRole("link", { name: "Request an invite" });
    expect(invite.getAttribute("href")).toBe("/contact#beta");
    expect(invite.getAttribute("data-variant")).toBe("primary");
    // The sample preview has no AI connection in it, so the page does not offer it.
    expect(within(hero).queryByRole("link", { name: "Interactive preview" })).toBeNull();
    expectPageRules(hero, { projectionNotices: 0 });
  });

  it("says what it does in three facts and shows three example questions", () => {
    renderPage();
    expect(
      screen.getByText(
        "Connect an AI assistant such as Claude Desktop to Flump and ask questions in your own words.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText("Tax and debt figures are calculated by Flump, not by the AI model."),
    ).toBeDefined();
    expect(screen.getByText(AI_STAGING_SENTENCE)).toBeDefined();
    for (const q of EXAMPLE_QUESTIONS) expect(screen.getByText(q)).toBeDefined();
    expect(EXAMPLE_QUESTIONS).toHaveLength(3);
    // Plain question cards: no repeated decorative icon.
    expect(screen.getByRole("main").querySelectorAll("li [data-tile-tone]")).toHaveLength(0);
  });

  it("does not read as if every invited account can turn it on", () => {
    renderPage();
    const main = screen.getByRole("main").textContent ?? "";
    // The old present-tense steps are gone; "How to get it" (version 1) promises nothing.
    expect(screen.queryByRole("heading", { name: /how to turn it on/i })).toBeNull();
    expect(main).not.toMatch(/Request an invite and sign in to Flump/);
    expect(main).not.toMatch(/we switch|when you ask/i);
    expect(main).not.toMatch(/source code|coming soon|by invitation/i);
  });

  it("keeps the #setup anchor the web app links to, and marks no area in the strip", () => {
    renderPage();
    expect(document.getElementById("setup")).not.toBeNull();
    const strip = screen.getByTestId("area-strip");
    expect(within(strip).getAllByRole("link")).toHaveLength(5);
    expect(within(strip).queryByRole("link", { current: "page" })).toBeNull();
  });

  it("says how to get it in the decided words (version 1), with 'Ask us' linking to Contact", () => {
    renderPage();
    const section = screen.getByRole("region", { name: "How to get it" });
    expect(section.id).toBe("setup");
    expect(screen.getByTestId("mcp-how-to-get-it").textContent).toBe(
      "While Flump is being tested, the AI connection is switched on one account at a time. Ask us to switch it on for yours. Once it is on, create an access token in Settings and add Flump to your AI assistant.",
    );
    expect(within(section).getByRole("link", { name: "Ask us" }).getAttribute("href")).toBe(
      "/contact",
    );
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
    expect(screen.getByText(/The steps to connect are in the Flump app/)).toBeDefined();
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
