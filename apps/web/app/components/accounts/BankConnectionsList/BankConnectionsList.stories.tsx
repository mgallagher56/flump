import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import BankConnectionsList from "./BankConnectionsList";

const connections = [
  {
    id: "c1",
    institutionId: "monzo",
    institutionName: "Monzo Bank",
    status: "connected" as const,
    lastSyncedAt: "2026-11-04T12:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "c2",
    institutionId: "starling",
    institutionName: "Starling Bank",
    status: "error" as const,
    lastSyncedAt: "2026-11-03T10:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "c3",
    institutionId: "hsbc",
    institutionName: "HSBC UK",
    status: "disconnected" as const,
    lastSyncedAt: "2026-10-01T10:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const meta: Meta<typeof BankConnectionsList> = {
  title: "Accounts/BankConnectionsList",
  component: BankConnectionsList,
  args: { connections, canConnect: true },
};

export default meta;
type Story = StoryObj<typeof BankConnectionsList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Sync Monzo Bank" })).toBeDefined();
    await expect(canvas.getByText("Disconnected")).toBeDefined();
  },
};

export const Empty: Story = { args: { connections: [] } };
