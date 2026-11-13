import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { DebtHelpLink } from "./DebtHelpLink";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof DebtHelpLink> = {
  title: "Debt/DebtHelpLink",
  component: DebtHelpLink,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof DebtHelpLink>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole("link", { name: /MoneyHelper/ });
    await expect(links[0]?.getAttribute("target")).toBe("_blank");
  },
};
