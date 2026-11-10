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
    expect(screen.getByText(/Connect Claude & Cursor directly to your UK finances/i)).toBeDefined();
    expect(screen.getByText(/Strict PII anonymisation:/i)).toBeDefined();
    expect(screen.getByText(/simulate_uk_tax_and_pension_sacrifice/i)).toBeDefined();
    expect(screen.getByText(/7100/)).toBeDefined();
    expect(screen.getByText(/8804/)).toBeDefined();

    const appLink = screen.getByRole("link", { name: /Generate token in app/i });
    expect(appLink.getAttribute("href")).toContain("/app/profile");
  });
});
