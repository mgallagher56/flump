import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { expect } from "storybook/test";
import { PageMeta } from "./PageMeta";

const meta: Meta<typeof PageMeta> = {
  title: "3. Patterns/Marketing/PageMeta",
  component: PageMeta,
  args: { title: "Pricing and plans | Flump", description: "Indicative pricing." },
  decorators: [
    (Story) => (
      <HelmetProvider>
        <Story />
      </HelmetProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PageMeta>;

// Non-visual: PageMeta renders nothing in the canvas and writes tags to document.head.
const assertTags: Story["play"] = async () => {
  await expect(document.head.querySelector('meta[property="og:title"]')).not.toBeNull();
  await expect(document.head.querySelector('meta[name="twitter:card"]')).not.toBeNull();
};

export const Light: Story = { globals: { theme: "light" }, play: assertTags };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertTags,
};
