import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { PROJECTION_NOTICE_TEXT, ProjectionNotice } from "./ProjectionNotice";

const meta: Meta<typeof ProjectionNotice> = {
  title: "3. Financial Patterns & Sections/ProjectionNotice",
  component: ProjectionNotice,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ProjectionNotice>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(PROJECTION_NOTICE_TEXT)).toBeInTheDocument();
  },
};

export const CustomWording: Story = {
  args: { children: "Mortgage figures are estimates based on the rate and term you enter." },
};
