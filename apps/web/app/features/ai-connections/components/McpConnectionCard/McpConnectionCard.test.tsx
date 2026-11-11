import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { McpConnectionCard } from "./McpConnectionCard";

describe("McpConnectionCard Feature Component", () => {
  it("renders connection card and toggles anonymization switch", () => {
    render(<McpConnectionCard />);

    expect(
      screen.getByText("Model Context Protocol (MCP) & AI Connections (preview)"),
    ).toBeDefined();
    expect(screen.getByText("Anonymize Bank & Institution Names over MCP")).toBeDefined();

    const toggle = screen.getByRole("button", { name: "Toggle bank name anonymization" });
    fireEvent.click(toggle);
    // Toggled without throwing
    expect(toggle).toBeDefined();
  });

  it("switches tabs between Local CLI preview and Active Tokens", () => {
    const initialTokens = [
      {
        id: "tok_1",
        name: "Cursor AI",
        tokenPrefix: "flump_pat_1122...3344",
        scopes: ["mcp:read:anonymized"],
        anonymizeInstitutions: true,
        expiresAt: null,
        lastUsedAt: null,
        totalToolCalls: 4,
        createdAt: new Date().toISOString(),
        isRevoked: false,
        isExpired: false,
      },
    ];

    render(<McpConnectionCard initialTokens={initialTokens} />);

    // Default tab shows the Local CLI preview note, with no npx snippet or remote URL
    expect(screen.getByText("Setting up Flump MCP (preview)")).toBeDefined();
    expect(
      screen.getByText("Local CLI (preview): run Flump MCP from source. Setup guide coming soon."),
    ).toBeDefined();
    expect(screen.queryByText(/npx/)).toBeNull();
    expect(screen.queryByText(/OAuth 2\.1/)).toBeNull();
    expect(screen.queryByRole("tab", { name: /Remote MCP/ })).toBeNull();

    // Click Active Tokens tab
    const activeTab = screen.getByRole("tab", { name: /Active Tokens/i });
    fireEvent.keyDown(activeTab, { key: "Enter", code: "Enter" });
    expect(screen.getByTestId("active-tokens-table")).toBeDefined();
    expect(screen.getByText("Cursor AI")).toBeDefined();
    expect(screen.getByText("4 calls")).toBeDefined();
  });

  it("handles token creation flow and displays generated token alert", async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      id: "tok_new",
      name: "ChatGPT Action",
      rawToken: "flump_pat_secret_abc123456789",
      tokenPrefix: "flump_pat_se...6789",
      scopes: ["mcp:read:anonymized"],
      anonymizeInstitutions: true,
      expiresAt: null,
    });

    render(<McpConnectionCard onGenerateToken={mockGenerate} />);

    const openBtn = screen.getByTestId("generate-token-trigger");
    fireEvent.click(openBtn);

    const nameInput = screen.getByLabelText("Connection / Client Name");
    fireEvent.change(nameInput, { target: { value: "ChatGPT Action" } });

    const submitBtn = screen.getByTestId("confirm-generate-token");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith("ChatGPT Action", true, 90);
    });

    expect(screen.getByTestId("new-token-banner")).toBeDefined();
    expect(screen.getByText("flump_pat_secret_abc123456789")).toBeDefined();
  });

  it("revokes an active token on user click", async () => {
    const mockRevoke = vi.fn().mockResolvedValue(undefined);
    const initialTokens = [
      {
        id: "tok_rev_1",
        name: "Claude Desktop",
        tokenPrefix: "flump_pat_aaaa...bbbb",
        scopes: ["mcp:read:anonymized"],
        anonymizeInstitutions: true,
        expiresAt: null,
        lastUsedAt: null,
        totalToolCalls: 12,
        createdAt: new Date().toISOString(),
        isRevoked: false,
        isExpired: false,
      },
    ];

    render(<McpConnectionCard initialTokens={initialTokens} onRevokeToken={mockRevoke} />);

    const activeTab = screen.getByRole("tab", { name: /Active Tokens/i });
    fireEvent.keyDown(activeTab, { key: "Enter", code: "Enter" });

    const revokeBtn = screen.getByTestId("revoke-token-tok_rev_1");
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith("tok_rev_1");
    });
  });

  it("states that Flump has no payment features", () => {
    render(<McpConnectionCard />);
    expect(screen.getByText("No payment features")).toBeDefined();
    expect(screen.queryByText(/read-only safe/i)).toBeNull();
  });

  it("describes calculations and anonymisation without overclaiming", () => {
    const { container } = render(<McpConnectionCard />);
    expect(
      screen.getByText("Deterministic calculations from the Flump finance engine"),
    ).toBeDefined();
    expect(
      screen.getByText("Institution names are replaced with generic labels by default"),
    ).toBeDefined();
    expect(container.textContent ?? "").not.toMatch(/hallucinat|PII Scrubbed|account numbers/i);
  });

  it("renders the offline context pack exporter card", () => {
    const mockFetchPack = vi.fn().mockResolvedValue({
      pack: { metadata: { isAnonymized: true } },
      markdown: "# Flump Context Pack",
    });

    render(<McpConnectionCard onFetchContextPack={mockFetchPack} />);

    expect(screen.getByTestId("offline-context-pack-card")).toBeDefined();
    expect(screen.getByTestId("copy-context-pack-btn")).toBeDefined();
    expect(screen.getByTestId("download-md-btn")).toBeDefined();
    expect(screen.getByTestId("download-json-btn")).toBeDefined();
  });
});
