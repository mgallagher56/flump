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
    expect(
      screen.getByText(/Give Claude and Cursor deterministic UK tax and finance tools/i),
    ).toBeDefined();
    expect(screen.getByText(/Institution names are replaced with generic labels/i)).toBeDefined();
    expect(screen.getByTestId("mcp-spotlight-preview-badge").textContent).toMatch(/preview/i);
    expect(screen.queryByText(/npx/)).toBeNull();
    expect(screen.getByText(/Setup guide coming soon/i)).toBeDefined();
    expect(document.body.textContent).not.toMatch(/PII-scrubbed|Strict PII/i);
    expect(screen.getByText(/simulate_uk_tax_and_pension_sacrifice/i)).toBeDefined();
    expect(screen.getByText(/7100/)).toBeDefined();
    expect(screen.getByText(/8804/)).toBeDefined();

    expect(screen.getByText("Example output")).toBeDefined();
    expect(screen.getByText(/baseline sample data/i)).toBeDefined();
    expect(document.body.textContent).not.toMatch(
      /ChatGPT|zero hallucinations|directly|free|2025\/26/i,
    );

    const appLink = screen.getByRole("link", { name: /Open profile in app/i });
    expect(appLink.getAttribute("href")).toContain("/app/profile");
  });
});
