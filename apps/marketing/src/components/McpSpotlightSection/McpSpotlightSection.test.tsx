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
    expect(screen.getByText(/There is no setup guide yet/i)).toBeDefined();
    expect(document.body.textContent).not.toMatch(/PII-scrubbed|Strict PII/i);
    expect(screen.getByText("get_tax_year_position")).toBeDefined();
    expect(screen.getAllByText("5286")).toHaveLength(2);
    expect(document.body.textContent).not.toContain("2114");

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
