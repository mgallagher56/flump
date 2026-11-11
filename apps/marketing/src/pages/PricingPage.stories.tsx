import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, within } from "storybook/test";
import { PricingPage } from "./PricingPage";

const meta: Meta<typeof PricingPage> = {
  title: "Marketing/PricingPage",
  component: PricingPage,
  decorators: [
    (Story) => (
      <HelmetProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof PricingPage>;

const assertPricing: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Placeholder price: not final")).toBeInTheDocument();
  await expect(canvas.getByText("£X")).toBeInTheDocument();
  await userEvent.click(canvas.getByRole("switch", { name: "Annual billing" }));
  await expect(canvas.getByText("£Y")).toBeInTheDocument();
  await expect(canvas.getByRole("button", { name: "Pricing coming soon" })).toBeDisabled();
};

export const Light: Story = { globals: { theme: "light" }, play: assertPricing };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPricing,
};
