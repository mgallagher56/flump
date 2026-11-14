import { ToastProvider } from "@repo/ui";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  HOW_TO_CONNECT_STEPS,
  HOW_TO_CONNECT_TITLE,
  McpConnectionCard,
  type McpTokenItem,
} from "./McpConnectionCard";

// Sample values only, built at runtime with no entropy: never a real token.
const SAMPLE_TOKEN = `flump_pat_${"x".repeat(32)}`;
const samplePrefix = (c: string) => `flump_pat_${c.repeat(4)}...${c.repeat(4)}`;

const token = (overrides: Partial<McpTokenItem> = {}): McpTokenItem => ({
  id: "tok_1",
  name: "Claude Desktop",
  tokenPrefix: samplePrefix("a"),
  scopes: ["mcp:read:anonymized"],
  anonymizeInstitutions: true,
  expiresAt: null,
  lastUsedAt: null,
  totalToolCalls: 1234,
  createdAt: "2026-11-01T00:00:00.000Z",
  isRevoked: false,
  isExpired: false,
  ...overrides,
});

const created = (overrides: Record<string, unknown> = {}) => ({
  id: "tok_new",
  name: "Client",
  rawToken: SAMPLE_TOKEN,
  tokenPrefix: samplePrefix("x"),
  scopes: ["mcp:read:anonymized"],
  anonymizeInstitutions: true,
  expiresAt: "2027-11-12T00:00:00.000Z",
  ...overrides,
});

describe("McpConnectionCard", () => {
  it("is two settings sections, each with one h2 and no version or SDK jargon", () => {
    const { container } = render(<McpConnectionCard />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["AI connections (preview)", "Export a summary for an AI assistant"]);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/SDK|v1\.0|baseline|sample data/i);
  });

  it("states each fact once, as a plain list", () => {
    const { container } = render(<McpConnectionCard />);
    const facts = within(screen.getByTestId("ai-connection-facts")).getAllByRole("listitem");
    expect(facts.map((li) => li.textContent)).toEqual([
      "Flump calculates the figures it sends to the assistant.",
      "Bank and provider names are always replaced with generic labels.",
      "Flump has no feature to make payments.",
      "Each connection can make up to 60 requests a minute.",
    ]);
    const text = container.textContent ?? "";
    expect(text.match(/generic labels/g)).toHaveLength(1);
    expect(text).not.toMatch(/whatever this setting says/);
    expect(text).not.toMatch(/hallucinat|PII Scrubbed|account numbers|read-only safe/i);
  });

  it("has no inner tabs and offers the setup steps in a closed How to connect disclosure", () => {
    render(<McpConnectionCard guideUrl="https://example.test/mcp#setup" />);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
    const toggle = screen.getByRole("button", { name: HOW_TO_CONNECT_TITLE });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    const panel = screen.getByTestId("set-up-panel");
    expect(within(panel).getAllByRole("listitem")).toHaveLength(HOW_TO_CONNECT_STEPS.length);
    const link = within(panel).getByRole("link", { name: /AI connections on the Flump website/ });
    expect(link.getAttribute("href")).toBe("https://example.test/mcp#setup");
    expect(screen.queryByText(/no setup guide/)).toBeNull();
    expect(screen.queryByText(/npx/)).toBeNull();
    expect(screen.queryByText(/OAuth 2\.1/)).toBeNull();
  });

  it("shows no token list when there are no tokens", () => {
    render(<McpConnectionCard />);
    expect(screen.queryByTestId("active-tokens-table")).toBeNull();
    expect(screen.queryByText(/No tokens yet/)).toBeNull();
  });

  it("lists each token as one row with en-GB counts and neutral badges", () => {
    render(
      <McpConnectionCard
        initialTokens={[
          token({ lastUsedAt: "2026-11-09T14:30:00.000Z" }),
          token({ id: "tok_2", name: "Old", isRevoked: true, totalToolCalls: 1 }),
          token({ id: "tok_3", name: "Stale", isExpired: true }),
        ]}
      />,
    );
    const list = screen.getByTestId("active-tokens-table");
    expect(list.tagName).toBe("UL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const first = screen.getByTestId("token-row-tok_1");
    expect(within(first).getByText("Claude Desktop")).toBeDefined();
    expect(within(first).getByText("1,234 requests")).toBeDefined();
    expect(within(first).getByText("Last used 09/11/2026")).toBeDefined();
    expect(within(first).getByText("Active")).toBeDefined();
    expect(within(first).getByText("Names hidden")).toBeDefined();
    expect(within(screen.getByTestId("token-row-tok_2")).getByText("1 request")).toBeDefined();
    expect(within(screen.getByTestId("token-row-tok_2")).getByText("Not used yet")).toBeDefined();
    // Disconnected and expired tokens keep their badge and lose the Disconnect button.
    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(screen.getByText("Expired")).toBeDefined();
    expect(screen.getByTestId("revoke-token-tok_1")).toBeDefined();
    expect(screen.queryByTestId("revoke-token-tok_2")).toBeNull();
    expect(screen.queryByTestId("revoke-token-tok_3")).toBeNull();
    expect(screen.getByRole("button", { name: "Disconnect Claude Desktop" })).toBeDefined();
  });

  it("creates a token, shows it once and raises a toast", async () => {
    const mockGenerate = vi.fn().mockResolvedValue(created({ name: "ChatGPT Action" }));
    render(
      <ToastProvider>
        <McpConnectionCard onGenerateToken={mockGenerate} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByTestId("generate-token-trigger"));
    fireEvent.change(screen.getByLabelText("Connection name"), {
      target: { value: "ChatGPT Action" },
    });
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    await waitFor(() =>
      expect(mockGenerate).toHaveBeenCalledWith("ChatGPT Action", true, 90, false),
    );
    const banner = await screen.findByTestId("new-token-banner");
    expect(banner.textContent).toContain(SAMPLE_TOKEN);
    expect(banner.textContent).toContain("It will not be shown again.");
    // The banner is the confirmation: no toast repeats it.
    expect(screen.getAllByText("Token created")).toHaveLength(1);
  });

  it("offers only expiring tokens and sends the chosen expiry", async () => {
    const mockGenerate = vi.fn().mockResolvedValue(created());
    render(<McpConnectionCard onGenerateToken={mockGenerate} />);
    fireEvent.click(screen.getByTestId("generate-token-trigger"));
    fireEvent.change(screen.getByLabelText("Connection name"), { target: { value: "Client" } });
    const select = screen.getByLabelText("Token expires after") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["7", "30", "90", "365"]);
    fireEvent.change(select, { target: { value: "365" } });
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith("Client", true, 365, false));
  });

  it("always requests an anonymised token, even if the summary switch is off", async () => {
    const mockGenerate = vi.fn().mockResolvedValue(created());
    render(<McpConnectionCard onGenerateToken={mockGenerate} />);
    fireEvent.click(screen.getByTestId("mcp-anonymize-toggle"));
    fireEvent.click(screen.getByTestId("generate-token-trigger"));
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    await waitFor(() =>
      expect(mockGenerate).toHaveBeenCalledWith("Claude Desktop", true, 90, false),
    );
  });

  it("asks for the staging scope only when the user turns it on, and labels such tokens", async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValue(created({ scopes: ["mcp:read:anonymized", "write:stage"] }));
    render(<McpConnectionCard onGenerateToken={mockGenerate} />);
    fireEvent.click(screen.getByTestId("generate-token-trigger"));
    const toggle = screen.getByRole("switch", {
      name: "Let this connection prepare imports for you to review",
    }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByTestId("confirm-generate-token"));
    await waitFor(() =>
      expect(mockGenerate).toHaveBeenCalledWith("Claude Desktop", true, 90, true),
    );
    expect(await screen.findByText("Can prepare imports")).toBeDefined();
  });

  it("asks before disconnecting, then marks the token and raises a toast", async () => {
    const mockRevoke = vi.fn().mockResolvedValue(undefined);
    render(
      <ToastProvider>
        <McpConnectionCard initialTokens={[token()]} onRevokeToken={mockRevoke} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByTestId("revoke-token-tok_1"));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Disconnect Claude Desktop?")).toBeDefined();
    expect(mockRevoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("revoke-token-dialog-confirm"));
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith("tok_1"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(await screen.findByText("Token disconnected")).toBeDefined();
  });

  it("does nothing when the disconnect is cancelled", () => {
    const mockRevoke = vi.fn();
    render(<McpConnectionCard initialTokens={[token()]} onRevokeToken={mockRevoke} />);
    fireEvent.click(screen.getByTestId("revoke-token-tok_1"));
    fireEvent.click(screen.getByTestId("revoke-token-dialog-cancel"));
    expect(mockRevoke).not.toHaveBeenCalled();
    expect(screen.getByText("Active")).toBeDefined();
  });

  it("keeps a token active and shows an error when disconnecting fails", async () => {
    const revoke = vi.fn().mockRejectedValue(new Error("boom"));
    render(<McpConnectionCard initialTokens={[token()]} onRevokeToken={revoke} />);
    fireEvent.click(screen.getByTestId("revoke-token-tok_1"));
    fireEvent.click(screen.getByTestId("revoke-token-dialog-confirm"));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "The token could not be disconnected. Try again in a moment.",
    );
    expect(screen.queryByText("Disconnected")).toBeNull();
  });

  it("exports the summary with names hidden unless the switch is turned off", async () => {
    const mockFetchPack = vi.fn().mockResolvedValue({ pack: {}, markdown: "# Flump" });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(
      <ToastProvider>
        <McpConnectionCard onFetchContextPack={mockFetchPack} />
      </ToastProvider>,
    );
    expect(screen.getByTestId("download-md-btn")).toBeDefined();
    expect(screen.getByTestId("download-json-btn")).toBeDefined();
    fireEvent.click(screen.getByTestId("copy-context-pack-btn"));
    await waitFor(() => expect(mockFetchPack).toHaveBeenCalledWith(true));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("# Flump"));
    expect(await screen.findByText("Summary copied")).toBeDefined();
    fireEvent.click(
      screen.getByRole("switch", { name: "Hide bank and provider names in the summary" }),
    );
    fireEvent.click(screen.getByTestId("copy-context-pack-btn"));
    await waitFor(() => expect(mockFetchPack).toHaveBeenLastCalledWith(false));
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
});
