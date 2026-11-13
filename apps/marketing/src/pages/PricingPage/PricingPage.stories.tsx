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
  await expect(canvas.getByRole("heading", { level: 1, name: "Pricing" })).toBeInTheDocument();
  await expect(canvas.getByText("Free today")).toBeInTheDocument();
  await expect(canvas.getByText("£4.99")).toBeInTheDocument();
  await expect(canvas.getByText("Example figure only. No price is set.")).toBeInTheDocument();
  await expect(canvas.getByText(/free, invite-only beta/i)).toBeInTheDocument();
  const toggle = canvas.getByRole("switch", { name: "Annual billing" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await userEvent.click(toggle);
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(canvas.getByText("£49")).toBeInTheDocument();
  await userEvent.click(toggle);
  await expect(canvas.getByText("£4.99")).toBeInTheDocument();
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
