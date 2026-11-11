import type { Meta, StoryObj } from "@storybook/react";
import { Section24Calculator } from "./Section24Calculator";

const meta: Meta<typeof Section24Calculator> = {
  title: "3. Calculators/Section24Calculator",
  component: Section24Calculator,
};

export default meta;
type Story = StoryObj<typeof Section24Calculator>;

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { test: "todo" } },
};
