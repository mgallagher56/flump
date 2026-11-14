import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { McpConnectionCard } from "./McpConnectionCard";

// Sample values only, built at runtime with no entropy: never a real token.
const SAMPLE_TOKEN = `flump_pat_${"x".repeat(32)}`;
const samplePrefix = (c: string) => `flump_pat_${c.repeat(4)}...${c.repeat(4)}`;

const meta: Meta<typeof McpConnectionCard> = {
  title: "3. Patterns/AI connections/McpConnectionCard",
  component: McpConnectionCard,
  parameters: { layout: "padded" },
  args: {
    onGenerateToken: fn(async () => ({
      id: "tok_play_1",
      name: "Cursor",
      rawToken: SAMPLE_TOKEN,
      tokenPrefix: samplePrefix("x"),
      scopes: ["mcp:read:anonymized"],
      anonymizeInstitutions: true,
      expiresAt: "2027-02-12T00:00:00.000Z",
    })),
    onRevokeToken: fn(async () => undefined),
    onFetchContextPack: fn(async () => ({
      pack: { metadata: { isAnonymized: true } },
      markdown: "# Flump context pack\nStorybook export",
    })),
  },
};

export default meta;
type Story = StoryObj<typeof McpConnectionCard>;

const withTokens = [
  {
    id: "tok_existing_1",
    name: "Claude Desktop",
    tokenPrefix: samplePrefix("a"),
    scopes: ["mcp:read:anonymized", "write:stage"],
    anonymizeInstitutions: true,
    expiresAt: "2026-12-31T00:00:00.000Z",
    lastUsedAt: "2026-11-09T14:30:00.000Z",
    totalToolCalls: 1218,
    createdAt: "2026-10-01T10:00:00.000Z",
    isRevoked: false,
    isExpired: false,
  },
  {
    id: "tok_existing_2",
    name: "Old laptop",
    tokenPrefix: samplePrefix("b"),
    scopes: ["mcp:read:anonymized"],
    anonymizeInstitutions: true,
    expiresAt: "2026-11-01T00:00:00.000Z",
    lastUsedAt: null,
    totalToolCalls: 0,
    createdAt: "2026-08-01T12:00:00.000Z",
    isRevoked: true,
    isExpired: false,
  },
];

/** The create form: only expiring tokens (E20-N16), created and shown once. */
export const Default: Story = {
  args: { initialTokens: [] },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/SDK/)).toBeNull();
    await userEvent.click(canvas.getByTestId("generate-token-trigger"));
    const select = canvas.getByLabelText("Token expires after") as HTMLSelectElement;
    await expect(Array.from(select.options).map((o) => o.value)).toEqual(["7", "30", "90", "365"]);
    await expect(select.value).toBe("90");
    await userEvent.click(canvas.getByTestId("confirm-generate-token"));
    await expect(args.onGenerateToken).toHaveBeenCalledWith("Claude Desktop", true, 90, false);
    await expect(await canvas.findByTestId("new-token-banner")).toBeInTheDocument();
  },
};

export const DefaultDark: Story = {
  args: { initialTokens: [] },
  globals: { theme: "dark" },
};

/** Two tokens, one disconnected: rows stack on phones, and Disconnect asks first. */
export const WithActiveTokens: Story = {
  args: { initialTokens: withTokens },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(canvas.queryByRole("tab")).toBeNull();
    await expect(canvas.getByTestId("token-row-tok_existing_2")).toHaveTextContent("Disconnected");
    await expect(canvas.getByText("1,218 requests")).toBeInTheDocument();
    await expect(canvas.queryByTestId("revoke-token-tok_existing_2")).toBeNull();
    await userEvent.click(canvas.getByTestId("revoke-token-tok_existing_1"));
    await expect(await page.findByText("Disconnect Claude Desktop?")).toBeInTheDocument();
    await userEvent.click(page.getByRole("button", { name: "Disconnect" }));
    await expect(args.onRevokeToken).toHaveBeenCalledWith("tok_existing_1");
  },
};

export const WithActiveTokensDark: Story = {
  args: { initialTokens: withTokens },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("active-tokens-table")).toBeVisible();
    await userEvent.click(canvas.getByTestId("revoke-token-tok_existing_1"));
    const page = within(canvasElement.ownerDocument.body);
    await expect(await page.findByText("Disconnect Claude Desktop?")).toBeInTheDocument();
  },
};

/** At phone width the rows stack, so Disconnect stays on screen with no sideways scroll. */
export const WithActiveTokensMobile: Story = {
  args: { initialTokens: withTokens },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByTestId("active-tokens-table");
    await expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    await expect(canvas.getByTestId("revoke-token-tok_existing_1")).toBeVisible();
  },
};

export const StagingOptIn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("generate-token-trigger"));
    const toggle = canvas.getByRole("switch", {
      name: "Let this connection prepare imports for you to review",
    }) as HTMLInputElement;
    await expect(toggle.checked).toBe(false);
    await userEvent.click(toggle);
    await expect(toggle.checked).toBe(true);
  },
};

/** The summary switch decides whether the export hides bank and provider names. */
export const SummaryWithNamesShown: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("switch", {
      name: "Hide bank and provider names in the summary",
    }) as HTMLInputElement;
    await expect(toggle.checked).toBe(true);
    await userEvent.click(toggle);
    await userEvent.click(canvas.getByTestId("copy-context-pack-btn"));
    await expect(args.onFetchContextPack).toHaveBeenCalledWith(false);
  },
};

export const CreateFails: Story = {
  args: {
    onGenerateToken: fn(async () => {
      throw new Error("Connection tokens are not available for your account yet.");
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("generate-token-trigger"));
    await userEvent.click(canvas.getByTestId("confirm-generate-token"));
    await expect((await canvas.findByRole("alert")).textContent).toContain("not available");
  },
};
