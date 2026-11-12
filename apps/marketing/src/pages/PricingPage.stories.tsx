import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
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
  await expect(canvas.getByRole("heading", { level: 1, name: "Pricing" })).toBeInTheDocument();
  await expect(canvas.getByText("Free today")).toBeInTheDocument();
  // Default state: placeholder paid-plan card and billing toggle are hidden.
  // Set VITE_SHOW_PLACEHOLDERS=true to show them (covered in PricingPage.test.tsx).
  await expect(canvas.queryByText("Placeholder price: not final")).toBeNull();
  await expect(canvas.queryByText("£X")).toBeNull();
  await expect(canvas.queryByText("£Y")).toBeNull();
  await expect(canvas.queryByRole("switch", { name: "Annual billing" })).toBeNull();
  await expect(canvas.queryByText("Pricing coming soon")).toBeNull();
};

export const Light: Story = { globals: { theme: "light" }, play: assertPricing };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: {
    // E8 waiver: color-contrast
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    backgrounds: { default: "dark" },
  },
  play: assertPricing,
};
