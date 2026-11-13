import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { McpConnectionCard } from "./McpConnectionCard";

const meta: Meta<typeof McpConnectionCard> = {
  title: "3. Financial Patterns & Sections/McpConnectionCard",
  component: McpConnectionCard,
  parameters: {
    layout: "padded",
  },
  args: {
    onGenerateToken: fn().mockResolvedValue({
      id: "tok_play_1",
      name: "Cursor AI Agent",
      rawToken: "flump_pat_9876543210fedcba9876543210fedcba",
      tokenPrefix: "flump_pat_9876...dcba",
      scopes: ["mcp:read:anonymized", "mcp:simulate"],
      anonymizeInstitutions: true,
      expiresAt: null,
    }),
    onRevokeToken: fn().mockResolvedValue(undefined),
    onFetchContextPack: fn().mockResolvedValue({
      pack: { metadata: { isAnonymized: true } },
      markdown: "# FLUMP CONTEXT PACK\nMock markdown export for storybook",
    }),
  },
};

export default meta;
type Story = StoryObj<typeof McpConnectionCard>;

export const Default: Story = {
  // E8 waiver: aria-valid-attr-value
  parameters: { a11y: { config: { rules: [{ id: "aria-valid-attr-value", enabled: false }] } } },
  args: {
    initialTokens: [],
  },
};

export const ExpiryOptions: Story = {
  parameters: { a11y: { config: { rules: [{ id: "aria-valid-attr-value", enabled: false }] } } },
  args: { initialTokens: [], onGenerateToken: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("generate-token-trigger"));
    const select = canvas.getByLabelText("Token Expiry") as HTMLSelectElement;
    await expect(Array.from(select.options).map((o) => o.value)).toEqual(["7", "30", "90", "365"]);
    await expect(select.value).toBe("90");
    await expect(canvas.queryByText(/Never/)).toBeNull();
  },
};

export const WithActiveTokens: Story = {
  // E8 waiver: aria-valid-attr-value
  parameters: { a11y: { config: { rules: [{ id: "aria-valid-attr-value", enabled: false }] } } },
  args: {
    initialTokens: [
      {
        id: "tok_existing_1",
        name: "Claude Desktop",
        tokenPrefix: "flump_pat_ab12...ef34",
        scopes: ["mcp:read:anonymized", "mcp:simulate"],
        anonymizeInstitutions: true,
        expiresAt: "2026-12-31T00:00:00.000Z",
        lastUsedAt: "2026-11-09T14:30:00.000Z",
        totalToolCalls: 18,
        createdAt: "2026-10-01T10:00:00.000Z",
        isRevoked: false,
        isExpired: false,
      },
      {
        id: "tok_existing_2",
        name: "Custom Python Agent",
        tokenPrefix: "flump_pat_7788...9900",
        scopes: ["mcp:read:full", "mcp:simulate"],
        anonymizeInstitutions: false,
        expiresAt: null,
        lastUsedAt: null,
        totalToolCalls: 0,
        createdAt: "2026-11-01T12:00:00.000Z",
        isRevoked: true,
        isExpired: false,
      },
    ],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 1. Verify header exists
    await expect(
      canvas.getByText("Model Context Protocol (MCP) & AI Connections (preview)"),
    ).toBeInTheDocument();

    // 2. Toggle anonymization switch
    const toggle = canvas.getByRole("button", { name: "Toggle bank name anonymization" });
    await expect(toggle).toBeInTheDocument();
    await userEvent.click(toggle);

    // 3. Local CLI preview tab is shown by default
    await expect(canvas.getByTestId("local-cli-preview")).toBeInTheDocument();

    // 4. Switch to Active Tokens tab
    const activeTab = canvas.getByRole("tab", { name: /Active Tokens/i });
    await userEvent.click(activeTab);
    await expect(canvas.getByTestId("active-tokens-table")).toBeInTheDocument();

    // 5. Revoke active token
    const revokeBtn = canvas.getByTestId("revoke-token-tok_existing_1");
    await userEvent.click(revokeBtn);
    await expect(args.onRevokeToken).toHaveBeenCalledWith("tok_existing_1");
  },
};
