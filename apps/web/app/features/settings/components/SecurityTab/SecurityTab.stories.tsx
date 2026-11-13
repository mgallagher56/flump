import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { SecurityTab } from "./SecurityTab";

const meta: Meta<typeof SecurityTab> = {
  title: "3. Financial Patterns & Sections/Settings/SecurityTab",
  component: SecurityTab,
  parameters: { layout: "padded" },
  args: { email: "jane.doe@example.com" },
};

export default meta;
type Story = StoryObj<typeof SecurityTab>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("user-email-display").textContent).toContain("Verified");
    await expect(canvas.getByRole("button", { name: "Change password" })).toBeDefined();
  },
};
