import type { Meta, StoryObj } from "@storybook/react";
import { InteractiveFinancialTeaser } from "./InteractiveFinancialTeaser";

const meta: Meta<typeof InteractiveFinancialTeaser> = {
  title: "Marketing/InteractiveFinancialTeaser",
  component: InteractiveFinancialTeaser,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof InteractiveFinancialTeaser>;

export const Default: Story = {};
