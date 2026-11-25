import { OPTIONAL_STORAGE_KEY, STORAGE_PREFERENCE_LABEL, setOptionalStorageOff } from "@repo/ui";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { PrivacyChoicesSection } from "./PrivacyChoicesSection";

const meta: Meta<typeof PrivacyChoicesSection> = {
  title: "3. Patterns/Settings/PrivacyChoicesSection",
  component: PrivacyChoicesSection,
  parameters: { layout: "padded" },
  beforeEach: () => {
    setOptionalStorageOff(false);
    return () => setOptionalStorageOff(false);
  },
};

export default meta;
type Story = StoryObj<typeof PrivacyChoicesSection>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    within(canvas.getByRole("list", { name: "Legal pages" })).getAllByRole("link"),
  ).toHaveLength(4);
  const control = canvas.getByRole("switch", { name: STORAGE_PREFERENCE_LABEL });
  await expect(control).toBeChecked();
  await userEvent.click(control);
  await expect(control).not.toBeChecked();
  await expect(window.localStorage.getItem(OPTIONAL_STORAGE_KEY)).toBe("off");
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play,
};
