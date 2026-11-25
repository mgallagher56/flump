import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { SharingHelpLine } from "./SharingHelpLine";

const meta: Meta<typeof SharingHelpLine> = {
  title: "3. Patterns/Household/SharingHelpLine",
  component: SharingHelpLine,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SharingHelpLine>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: /Surviving Economic Abuse has information/ });
    await expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    await expect(canvas.getByText("Wording not yet approved by the owner")).toBeInTheDocument();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
