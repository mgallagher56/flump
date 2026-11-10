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
    remoteMcpUrl: "https://mcp.flump.co.uk/mcp",
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
  args: {
    initialTokens: [],
  },
};

export const WithActiveTokens: Story = {
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
      canvas.getByText("Model Context Protocol (MCP) & AI Connections"),
    ).toBeInTheDocument();

    // 2. Toggle anonymization switch
    const toggle = canvas.getByRole("button", { name: "Toggle bank name anonymization" });
    await expect(toggle).toBeInTheDocument();
    await userEvent.click(toggle);

    // 3. Switch to Remote MCP tab
    const remoteTab = canvas.getByRole("tab", { name: "Claude Web / ChatGPT (Remote MCP)" });
    await userEvent.click(remoteTab);
    await expect(canvas.getByTestId("remote-mcp-url-box")).toBeInTheDocument();

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
