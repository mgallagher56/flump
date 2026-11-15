import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { InfoTip } from "../../primitives/InfoTip";
import { Money } from "../../primitives/Money/Money";
import { ResultBlock } from "./ResultBlock";

const meta: Meta<typeof ResultBlock> = {
  title: "3. Patterns/ResultBlock",
  component: ResultBlock,
  parameters: { layout: "padded" },
  args: {
    label: "Breathing room",
    leadIn: "About",
    figure: "1.5 months",
    note: "How long your savings would cover the essentials.",
    row: { label: "Money to draw on", value: <Money size="sm" value={4200} /> },
  },
  decorators: [
    (Story) => (
      <div className={css({ maxWidth: "24rem" })}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ResultBlock>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const group = canvas.getByRole("group", { name: "Breathing room" });
  await expect(group).toHaveTextContent("About 1.5 months");
  await expect(canvas.getByText("Money to draw on")).toBeVisible();
  // A plain card: the result never takes the hero surface.
  await expect(canvasElement.querySelector('[data-tone="hero"]')).toBeNull();
};

export const Default: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

const withTip = (
  <InfoTip term="Breathing room">
    Savings means the accounts you can draw on. The essentials are your essential spending and
    minimum debt payments.
  </InfoTip>
);

const tipPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("button", { name: "About Breathing room" })).toBeVisible();
};

export const WithInfoTip: Story = {
  globals: { theme: "light" },
  args: { labelAddon: withTip },
  play: tipPlay,
};

export const WithInfoTipDark: Story = {
  globals: { theme: "dark" },
  args: { labelAddon: withTip },
  play: tipPlay,
};

const emptyPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Add your essential spending to see this.")).toBeVisible();
  await expect(canvasElement.querySelector('[data-slot="figure"]')).toBeNull();
};

const emptyArgs = {
  figure: null,
  leadIn: undefined,
  row: undefined,
  emptyPrompt: "Add your essential spending to see this.",
};

export const NotKnown: Story = { globals: { theme: "light" }, args: emptyArgs, play: emptyPlay };

export const NotKnownDark: Story = { globals: { theme: "dark" }, args: emptyArgs, play: emptyPlay };
