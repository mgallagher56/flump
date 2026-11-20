import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { SectionBand } from "./SectionBand";

const placeholder = css({
  p: "10",
  textAlign: "center",
  borderWidth: "1px",
  borderStyle: "dashed",
  borderColor: "border",
  borderRadius: "card",
  color: "text.secondary",
});

const meta: Meta<typeof SectionBand> = {
  title: "3. Patterns/SectionBand",
  component: SectionBand,
  parameters: { layout: "fullscreen" },
  args: {
    id: "story-band",
    title: "See your money in one place",
    subtitle: "A short line under the section title.",
    children: <div className={placeholder}>Section content</div>,
  },
  argTypes: { tone: { control: "select", options: ["canvas", "sunken"] } },
};

export default meta;
type Story = StoryObj<typeof SectionBand>;

const assertBand: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("region", { name: "See your money in one place" }),
  ).toBeInTheDocument();
};

const dark = { globals: { theme: "dark" }, parameters: { backgrounds: { default: "dark" } } };

export const Canvas: Story = { args: { tone: "canvas" }, play: assertBand };
export const Sunken: Story = { args: { tone: "sunken" }, play: assertBand };
export const CanvasDark: Story = { ...dark, args: { tone: "canvas" }, play: assertBand };
export const SunkenDark: Story = { ...dark, args: { tone: "sunken" }, play: assertBand };

export const CentredNarrow: Story = {
  args: { tone: "sunken", align: "center", width: "narrow", size: "compact" },
  play: assertBand,
};

export const AppVariant: Story = {
  parameters: { layout: "padded" },
  args: {
    variant: "app",
    id: "where-you-stand",
    title: "Where you stand",
    subtitle: "Your main figures this month. Sample data.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "Where you stand" })).toBeInTheDocument();
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Where you stand" }),
    ).toBeInTheDocument();
  },
};

export const AppVariantDark: Story = {
  ...AppVariant,
  globals: { theme: "dark" },
  parameters: { layout: "padded", backgrounds: { default: "dark" } },
};
