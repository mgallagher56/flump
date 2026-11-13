import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Text, type TextStyleName } from "./Text";
import { textColors } from "./Text.styles";

const stack = css({ display: "flex", flexDirection: "column", gap: "2", maxWidth: "28rem" });
const onHero = css({ backgroundColor: "surface.hero", padding: "4", borderRadius: "xl" });

const meta: Meta<typeof Text> = {
  title: "2. Primitives/Text",
  component: Text,
  parameters: { layout: "padded" },
  args: { children: "You have £12,400 set aside for the next twelve months." },
};

export default meta;
type Story = StoryObj<typeof Text>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/set aside/).length).toBeGreaterThan(0);
  },
};

const ColoursGallery = () => (
  <div className={stack}>
    {textColors
      .filter((c) => c !== "onContrast")
      .map((color) => (
        <Text color={color} key={color}>
          {color} text
        </Text>
      ))}
    <div className={onHero}>
      <Text color="onContrast">onContrast on the hero surface</Text>
    </div>
  </div>
);

const colourPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByText("danger text").length).toBeGreaterThan(0);
};

export const Colours: Story = { render: () => <ColoursGallery />, play: colourPlay };

const styles: TextStyleName[] = ["body.lg", "body.md", "body.sm", "label.md", "label.sm"];

export const Styles: Story = {
  render: () => (
    <div className={stack}>
      {styles.map((textStyle) => (
        <Text key={textStyle} textStyle={textStyle}>
          {textStyle}: your monthly surplus
        </Text>
      ))}
      <Text tabular textStyle="numeric.lg">
        £1,234,567.89
      </Text>
    </div>
  ),
};

export const Truncate: Story = {
  render: () => (
    <div className={stack}>
      <Text truncate>
        Cumulative interest saved by overpaying the credit consolidation loan across the whole term
      </Text>
      <Text lineClamp={2}>
        Cumulative interest saved by overpaying the credit consolidation loan across the whole term,
        compared with paying only the minimum each month for the next twenty five years.
      </Text>
    </div>
  ),
};

export const Light: Story = {
  globals: { theme: "light" },
  render: () => <ColoursGallery />,
  play: colourPlay,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => <ColoursGallery />,
  play: colourPlay,
};
