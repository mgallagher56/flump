import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { McpSpotlightSection } from "./McpSpotlightSection";

describe("McpSpotlightSection", () => {
  it("renders UK MCP value proposition, deterministic tax payload, and setup links", () => {
    render(
      <BrowserRouter>
        <McpSpotlightSection />
      </BrowserRouter>,
    );

    expect(screen.getByTestId("mcp-spotlight-section")).toBeDefined();
    expect(screen.getByText(/Ask Claude or Cursor about your own saved finances/i)).toBeDefined();
    expect(screen.getByText(/Institution names are replaced with generic labels/i)).toBeDefined();
    expect(screen.getByTestId("mcp-spotlight-preview-badge").textContent).toMatch(/preview/i);
    expect(screen.queryByText(/npx/)).toBeNull();
    expect(screen.getByText(/Setup guide coming soon/i)).toBeDefined();
    expect(document.body.textContent).not.toMatch(/PII-scrubbed|Strict PII/i);
    expect(screen.getByText("get_tax_year_position")).toBeDefined();
    expect(screen.getByText("5286")).toBeDefined();
    expect(screen.getByText("2114.4")).toBeDefined();

    expect(screen.getByText("Example output")).toBeDefined();
    expect(document.body.textContent).not.toMatch(
      /sample data|simulate_uk_tax|optimal|escape|save tax/i,
    );
    expect(document.body.textContent).not.toMatch(
      /ChatGPT|zero hallucinations|directly|free|2025\/26/i,
    );

    const appLink = screen.getByRole("link", { name: /Open profile in app/i });
    expect(appLink.getAttribute("href")).toContain("/app/profile");
  });
});
