import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { WidgetSettingsModal } from "./WidgetSettingsModal";

const meta: Meta<typeof WidgetSettingsModal> = {
  title: "Dashboard/WidgetSettingsModal",
  component: WidgetSettingsModal,
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Tax widget settings",
    description: "Customise the primary tax metric and income filter.",
    children: <p>Settings controls go here.</p>,
  },
};

export default meta;
type Story = StoryObj<typeof WidgetSettingsModal>;

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const dialog = await within(doc.body).findByRole("dialog", { name: "Tax widget settings" });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await userEvent.tab();
    await expect(dialog.contains(doc.activeElement)).toBe(true);
  },
};

export const Dark: Story = { ...Open, globals: { theme: "dark" } };
