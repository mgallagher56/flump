import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { DrawnLineChart } from "./DrawnLineChart";

const meta: Meta<typeof DrawnLineChart> = {
  title: "3. Patterns/Marketing/DrawnLineChart",
  component: DrawnLineChart,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className={css({ maxWidth: "480px", paddingTop: "10" })}>
        <Story />
      </div>
    ),
  ],
  args: {
    id: "story",
    values: [15_100, 16_000, 17_300, 18_400, 19_600, 20_300, 19_400, 20_100, 20_900],
    readouts: [
      "£15,100, Mar",
      "£16,000, Apr",
      "£17,300, May",
      "£18,400, Jun",
      "£19,600, Jul",
      "£20,300, Aug",
      "£19,400, Sep",
      "£20,100, Oct",
      "£20,900, Nov",
    ],
    min: 14_500,
    max: 21_500,
    ticks: [
      { label: "Mar", index: 0 },
      { label: "Jul", index: 4 },
      { label: "Nov", index: 8 },
    ],
    tone: "sky",
  },
};

export default meta;
type Story = StoryObj<typeof DrawnLineChart>;

const assertChart: Story["play"] = async ({ canvasElement }) => {
  await expect(canvasElement.querySelector("[data-readout-text]")?.textContent).toBe(
    "£20,900, Nov",
  );
  await expect(canvasElement.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
};

export const Light: Story = { globals: { theme: "light" }, play: assertChart };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertChart,
};
