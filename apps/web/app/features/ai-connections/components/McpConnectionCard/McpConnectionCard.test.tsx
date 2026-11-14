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
      expect(mockGenerate).toHaveBeenCalledWith("ChatGPT Action", true, 90, false);
    });

    expect(screen.getByTestId("new-token-banner")).toBeDefined();
    expect(screen.getByText("flump_pat_secret_abc123456789")).toBeDefined();
  });

  it("offers only expiring tokens and sends the chosen expiry", async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      id: "tok_exp",
      name: "Client",
      rawToken: "flump_pat_secret_zzz",
      tokenPrefix: "flump_pat_zz...zzz",
      scopes: ["mcp:read:anonymized"],
      anonymizeInstitutions: true,
      expiresAt: "2027-11-12T00:00:00.000Z",
    });
    render(<McpConnectionCard onGenerateToken={mockGenerate} />);
    fireEvent.click(screen.getByTestId("generate-token-trigger"));
    fireEvent.change(screen.getByLabelText("Connection / Client Name"), {
      target: { value: "Client" },
    });

    const select = screen.getByLabelText("Token Expiry") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["7", "30", "90", "365"]);
    expect(screen.queryByText(/Never/)).toBeNull();

    fireEvent.change(select, { target: { value: "365" } });
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith("Client", true, 365, false));
  });

  it("always requests an anonymised token, even if the context-pack toggle is off", async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      id: "tok_a",
      name: "Client",
      rawToken: "flump_pat_secret_aaa",
      tokenPrefix: "flump_pat_aa...aaa",
      scopes: ["mcp:read:anonymized"],
      anonymizeInstitutions: true,
      expiresAt: "2027-11-12T00:00:00.000Z",
    });
    render(<McpConnectionCard onGenerateToken={mockGenerate} />);
    fireEvent.click(screen.getByTestId("mcp-anonymize-toggle"));
    fireEvent.click(screen.getByTestId("generate-token-trigger"));
    fireEvent.change(screen.getByLabelText("Connection / Client Name"), {
      target: { value: "Client" },
    });
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith("Client", true, 90, false));
  });

  it("asks for the staging scope only when the user turns it on, and labels such tokens", async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      id: "tok_s",
      name: "Client",
      rawToken: "flump_pat_secret_sss",
      tokenPrefix: "flump_pat_ss...sss",
      scopes: ["mcp:read:anonymized", "write:stage"],
      anonymizeInstitutions: true,
      expiresAt: "2027-11-12T00:00:00.000Z",
    });
    render(<McpConnectionCard onGenerateToken={mockGenerate} />);
    fireEvent.click(screen.getByTestId("generate-token-trigger"));
    const toggle = screen.getByRole("switch", {
      name: "Let this connection stage imports for you to review",
    }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.change(screen.getByLabelText("Connection / Client Name"), {
      target: { value: "Client" },
    });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith("Client", true, 90, true));
    fireEvent.keyDown(screen.getByRole("tab", { name: /Active Tokens/ }), { key: "Enter" });
    expect(screen.getByText("Can stage imports")).toBeDefined();
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

  it("shows a known safe message when creating fails, and a fixed line for anything else", async () => {
    const failing = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection tokens are not available for your account yet."))
      .mockRejectedValueOnce(new Error("internal stack trace"));
    render(<McpConnectionCard onGenerateToken={failing} />);
    fireEvent.click(screen.getByTestId("generate-token-trigger"));
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Connection tokens are not available for your account yet.",
    );
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "The token could not be created. Try again in a moment.",
      ),
    );
  });

  it("keeps a token active and shows an error when revoking fails", async () => {
    const revoke = vi.fn().mockRejectedValue(new Error("boom"));
    const tokens = [
      {
        id: "tok_rev_1",
        name: "Claude Desktop",
        tokenPrefix: "flump_pat_aaaa...bbbb",
        scopes: ["mcp:read:anonymized"],
        anonymizeInstitutions: true,
        expiresAt: null,
        lastUsedAt: null,
        totalToolCalls: 1,
        createdAt: "2026-11-01T00:00:00.000Z",
        isRevoked: false,
        isExpired: false,
      },
    ];
    render(<McpConnectionCard initialTokens={tokens} onRevokeToken={revoke} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: /Active Tokens/i }), { key: "Enter" });
    fireEvent.click(screen.getByTestId("revoke-token-tok_rev_1"));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "The token could not be revoked. Try again in a moment.",
    );
    expect(screen.queryByText("Revoked")).toBeNull();
  });
});
