import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { SecurityPage } from "./SecurityPage";

const meta: Meta<typeof SecurityPage> = {
  title: "Marketing/SecurityPage",
  component: SecurityPage,
  decorators: [
    (Story) => (
      <HelmetProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof SecurityPage>;

const assertHeading: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Security and privacy" }),
  ).toBeInTheDocument();
  await expect(canvas.queryByRole("dialog")).toBeNull();
};

export const Light: Story = {
  globals: { theme: "light" },
  play: assertHeading,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertHeading,
};
