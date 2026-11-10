import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { McpPage } from "./McpPage";

describe("Marketing McpPage", () => {
  it("renders the MCP hero, 6 value pillars, interactive setup tabs, and all 8 tools", () => {
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
    expect(screen.getByText("Zero AI hallucinations")).toBeDefined();
    expect(screen.getByText("Strict PII anonymisation")).toBeDefined();
    expect(screen.getByText("How to set up Flump MCP in 2 minutes")).toBeDefined();
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

    // Verify interactive tab switching
    expect(screen.getByTestId("setup-panel-desktop")).toBeDefined();

    fireEvent.click(screen.getByTestId("setup-tab-cursor"));
    expect(screen.getByTestId("setup-panel-cursor")).toBeDefined();

    fireEvent.click(screen.getByTestId("setup-tab-remote"));
    expect(screen.getByTestId("setup-panel-remote")).toBeDefined();
  });
});
