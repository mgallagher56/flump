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

const defaultPlay: Story["play"] = async ({ canvasElement }) => {
  const tag = within(canvasElement).getByText("Example");
  await expect(tag.tagName).toBe("SPAN");
  // 12px or larger, so it stays readable and scales with text size.
  await expect(Number.parseFloat(getComputedStyle(tag).fontSize)).toBeGreaterThanOrEqual(12);
};

export const Default: Story = { globals: { theme: "light" }, play: defaultPlay };

export const DefaultDark: Story = { globals: { theme: "dark" }, play: defaultPlay };

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
      <ExampleTag variant="onContrast" />
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

const phone375 = {
  viewports: {
    phone375: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
  },
  defaultViewport: "phone375",
};
const desktop1280 = {
  viewports: {
    desktop1280: {
      name: "Desktop 1280",
      styles: { width: "1280px", height: "800px" },
      type: "desktop",
    },
  },
  defaultViewport: "desktop1280",
};

export const OnCardsLight375: Story = { ...OnCardsLight, parameters: { viewport: phone375 } };
export const OnCardsDark375: Story = { ...OnCardsDark, parameters: { viewport: phone375 } };
export const OnCardsLight1280: Story = { ...OnCardsLight, parameters: { viewport: desktop1280 } };
export const OnCardsDark1280: Story = { ...OnCardsDark, parameters: { viewport: desktop1280 } };
