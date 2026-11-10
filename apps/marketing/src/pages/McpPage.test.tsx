import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { McpPage } from "./McpPage";

describe("Marketing McpPage", () => {
  it("renders the MCP hero, features, and setup guides", () => {
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
    expect(screen.getByText("Zero AI Hallucinations")).toBeDefined();
    expect(screen.getByText("Strict PII Anonymisation")).toBeDefined();
    expect(screen.getByText("How to set up Flump MCP in 2 minutes")).toBeDefined();
    expect(screen.getByText("8 Deterministic Financial Tools for AI Agents")).toBeDefined();
  });
});
