import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { expect, within } from "storybook/test";
import { PENSION_DETAILS_PATH, WorkplaceSalaryNotSet } from "./WorkplaceSalaryNotSet";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof WorkplaceSalaryNotSet> = {
  title: "3. Patterns/Retirement/WorkplaceSalaryNotSet",
  component: WorkplaceSalaryNotSet,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WorkplaceSalaryNotSet>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole("link", { name: "Add your salary on the Pension page" });
    await expect(links[0]?.getAttribute("href")).toBe(PENSION_DETAILS_PATH);
  },
};
