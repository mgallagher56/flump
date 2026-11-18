import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, within } from "storybook/test";
import { PreviewPage } from "./PreviewPage";

const meta: Meta<typeof PreviewPage> = {
  title: "Pages/PreviewPage",
  component: PreviewPage,
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
type Story = StoryObj<typeof PreviewPage>;

const previewPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 2, name: "Dashboard picture" })).toBeVisible();
  await expect(canvas.getByRole("heading", { level: 2, name: "Monthly check-in" })).toBeVisible();
  const [ownerSwitch] = canvas.getAllByRole("button", { name: "Paying a mortgage" });
  if (ownerSwitch) {
    await userEvent.click(ownerSwitch);
    await expect(ownerSwitch).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByText("Net worth, including your home estimate")).toBeVisible();
  }
};

export const Default: Story = { globals: { theme: "light" }, play: previewPlay };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: previewPlay,
};
