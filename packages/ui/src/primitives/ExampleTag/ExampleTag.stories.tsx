import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Card } from "../Card";
import { ExampleTag } from "./ExampleTag";

const row = css({ display: "flex", gap: "4", flexWrap: "wrap", alignItems: "flex-start" });
const cardBody = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "2",
  width: "240px",
});
const cardTitle = css({ textStyle: "label.md" });
const contrastCard = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "2",
  width: "240px",
  p: "density.cardPad",
  borderRadius: "card",
  backgroundColor: "surface.contrast",
  color: "text.onContrast",
});

const meta: Meta<typeof ExampleTag> = {
  title: "2. Primitives/ExampleTag",
  component: ExampleTag,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof ExampleTag>;

export const Default: Story = {
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const tag = within(canvasElement).getByText("Example");
    await expect(tag.tagName).toBe("SPAN");
    // 12px or larger, so it stays readable and scales with text size.
    await expect(Number.parseFloat(getComputedStyle(tag).fontSize)).toBeGreaterThanOrEqual(12);
  },
};

const OnCards = () => (
  <div className={row}>
    <Card as="article" className={cardBody} material="paper">
      <ExampleTag />
      <p className={cardTitle}>Payslip</p>
    </Card>
    <Card as="article" className={cardBody}>
      <ExampleTag />
      <p className={cardTitle}>Budget slip</p>
    </Card>
    <article className={contrastCard}>
      <ExampleTag tone="onContrast" />
      <p className={cardTitle}>Bank card</p>
    </article>
  </div>
);

const onCardsPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByText("Example")).toHaveLength(3);
  await expect(canvas.queryAllByRole("button")).toHaveLength(0);
};

/** On paper, on a plain card and on a charcoal contrast card. */
export const OnCardsLight: Story = {
  globals: { theme: "light" },
  render: () => <OnCards />,
  play: onCardsPlay,
};

export const OnCardsDark: Story = {
  globals: { theme: "dark" },
  render: () => <OnCards />,
  play: onCardsPlay,
};

export const CustomLabel: Story = {
  globals: { theme: "light" },
  args: { label: "Sample" },
};
