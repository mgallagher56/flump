import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { PricingPage } from "./PricingPage";

const meta: Meta<typeof PricingPage> = {
  title: "6. Pages/Marketing/PricingPage",
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
  await expect(canvas.getByRole("heading", { level: 1, name: "Pricing" })).toBeInTheDocument();
  await expect(canvas.getByRole("heading", { name: "Free during the beta" })).toBeVisible();
  await expect(canvas.getByText("Price not set")).toBeVisible();
  await expect(canvas.queryByRole("switch")).toBeNull();
  await expect(canvas.queryByText("£4.99")).toBeNull();
};

export const Light: Story = { globals: { theme: "light" }, play: assertPricing };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPricing,
};
