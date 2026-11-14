import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { McpPage } from "./McpPage";

describe("Marketing McpPage", () => {
  it("uses the shared sign-up CTA and neutral sample prompts", () => {
    const { container } = render(
      <HelmetProvider>
        <BrowserRouter>
          <McpPage />
        </BrowserRouter>
      </HelmetProvider>,
    );
    expect(
      screen.getAllByRole("link", { name: "Request an invite" })[0]?.getAttribute("href"),
    ).toBe("/contact#beta");
    expect(container.textContent).not.toMatch(/should I|reclaim|escape/i);
  });

  it("renders the MCP hero, preview label, value pillars, preview setup, and the current tools", () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <McpPage />
        </BrowserRouter>
      </HelmetProvider>,
    );

    expect(screen.getByText(/Ask your AI assistant about your own saved finances/i)).toBeDefined();
    expect(screen.getByText("Deterministic calculations")).toBeDefined();
    expect(document.body.textContent).not.toMatch(/sample data|optimal|escape|save tax/i);
    expect(screen.getByText("Try the MCP preview")).toBeDefined();
    expect(screen.getByText(/90 days is preselected/)).toBeDefined();
    expect(screen.getByText(/Institution names are replaced with generic labels/i)).toBeDefined();
    expect(screen.getByText("Setting up Flump MCP (preview)")).toBeDefined();
    expect(screen.getByTestId("mcp-preview-badge").textContent).toMatch(/preview/i);
    expect(screen.getByText("10 tools that read your saved data")).toBeDefined();

    // Every tool the MCP server serves today, and none it has removed (E17 re-plan, #637).
    for (const name of [
      "get_financial_snapshot",
      "get_budget_summary",
      "list_accounts",
      "get_balance_history",
      "get_data_coverage",
      "get_debt_overview",
      "simulate_debt_payoff",
      "list_tax_records",
      "get_tax_year_position",
      "project_net_worth",
    ]) {
      expect(screen.getByTestId(`mcp-tool-${name}`)).toBeDefined();
    }
    expect(document.body.textContent).not.toMatch(
      /simulate_uk_tax_and_pension_sacrifice|calculate_self_assessment_and_section24|evaluate_uk_student_loan|project_wealth_scenario|evaluate_cashflow_runway|query_transactions|compare_mortgage_overpay_vs_isa/,
    );

    // Preview setup: no remote tab, no tablist, no npx or remote instructions
    expect(screen.getByTestId("setup-panel-local")).toBeDefined();
    expect(screen.getAllByText(/Local CLI \(preview\)/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Setup guide coming soon/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("setup-tab-remote")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText(/npx @flump\/mcp|npx/)).toBeNull();

    const text = document.body.textContent ?? "";
    expect(text).toContain("Flump MCP tools have no payment feature");
    expect(text).not.toMatch(/never move money|strict/i);
    expect(text).not.toContain("oauth-protected-resource");
    expect(text).not.toContain("OAuth 2.1");
    expect(text).not.toMatch(/PII-scrubbed|Strict PII/i);
    expect(text).not.toMatch(
      /ChatGPT|zero hallucinations|zero LLM|directly|No credit card|free read-only/i,
    );
  });
});
