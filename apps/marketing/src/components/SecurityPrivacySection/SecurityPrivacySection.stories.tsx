import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { SecurityPrivacySection } from "./SecurityPrivacySection";

const meta: Meta<typeof SecurityPrivacySection> = {
  title: "3. Patterns/Marketing/SecurityPrivacySection",
  component: SecurityPrivacySection,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SecurityPrivacySection>;

const assertStrip: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "What Flump can and cannot do" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertStrip };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertStrip,
};
