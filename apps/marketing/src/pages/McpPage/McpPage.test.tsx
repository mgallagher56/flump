import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { McpPage } from "./McpPage";

describe("Marketing McpPage", () => {
  it("renders the MCP hero, preview label, value pillars, preview setup, and all 8 tools", () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <McpPage />
        </BrowserRouter>
      </HelmetProvider>,
    );

    expect(
      screen.getByText(/Give your AI agent deterministic UK financial intelligence/i),
    ).toBeDefined();
    expect(screen.getByText("Deterministic calculations")).toBeDefined();
    expect(screen.getAllByText(/baseline sample data/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Try the MCP preview")).toBeDefined();
    expect(screen.getByText(/90 days is preselected/)).toBeDefined();
    expect(screen.getByText(/Institution names are replaced with generic labels/i)).toBeDefined();
    expect(screen.getByText("Setting up Flump MCP (preview)")).toBeDefined();
    expect(screen.getByTestId("mcp-preview-badge").textContent).toMatch(/preview/i);
    expect(screen.getByText("8 deterministic financial tools for AI agents")).toBeDefined();

    // Verify all 8 tools are rendered
    expect(screen.getByTestId("mcp-tool-simulate_debt_payoff")).toBeDefined();
    expect(screen.getByTestId("mcp-tool-simulate_uk_tax_and_pension_sacrifice")).toBeDefined();
    expect(screen.getByTestId("mcp-tool-compare_mortgage_overpay_vs_isa")).toBeDefined();
    expect(screen.getByTestId("mcp-tool-calculate_self_assessment_and_section24")).toBeDefined();
    expect(screen.getByTestId("mcp-tool-project_wealth_scenario")).toBeDefined();
    expect(screen.getByTestId("mcp-tool-evaluate_cashflow_runway_and_health")).toBeDefined();
    expect(screen.getByTestId("mcp-tool-evaluate_uk_student_loan")).toBeDefined();
    expect(screen.getByTestId("mcp-tool-query_transactions_and_spending")).toBeDefined();

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
