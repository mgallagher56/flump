import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { ProgressRing } from "./ProgressRing";

const row = css({
  display: "flex",
  alignItems: "center",
  gap: "6",
  p: "6",
  backgroundColor: "surface.canvas",
});

const meta: Meta<typeof ProgressRing> = {
  title: "2. Primitives/ProgressRing",
  component: ProgressRing,
  parameters: { layout: "padded" },
  args: {
    label: "Setup progress",
    value: 2,
    max: 5,
  },
};

export default meta;
type Story = StoryObj<typeof ProgressRing>;

const RingGallery = () => (
  <div className={row}>
    <ProgressRing id="ring-0" label="None done" max={5} size="sm" value={0} />
    <ProgressRing id="ring-2" label="Two of five done" max={5} size="md" value={2} />
    <ProgressRing id="ring-5" label="All done" max={5} size="lg" value={5} />
  </div>
);

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const bars = canvas.getAllByRole("progressbar");
  await expect(bars).toHaveLength(3);
  await expect(bars[1]?.getAttribute("aria-valuetext")).toBe("2 of 5");
};

export const Light: Story = {
  globals: { theme: "light" },
  render: () => <RingGallery />,
  play,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => <RingGallery />,
  play,
};
