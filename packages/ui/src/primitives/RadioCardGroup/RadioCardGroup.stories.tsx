import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { RadioCardGroup, type RadioCardOption } from "./RadioCardGroup";

const meta: Meta<typeof RadioCardGroup> = {
  title: "2. Primitives/RadioCardGroup",
  component: RadioCardGroup,
  parameters: { layout: "padded" },
  args: {
    legend: "How should we pay your debts off?",
    hint: "You can change this at any time",
    defaultValue: "avalanche",
    options: [
      {
        value: "avalanche",
        label: "Avalanche",
        description: "Pay the highest interest rate first",
        badge: "Saves most interest",
      },
      {
        value: "snowball",
        label: "Snowball",
        description: "Clear the smallest balance first for quick wins",
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof RadioCardGroup>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const avalanche = canvas.getByRole("radio", { name: /Avalanche/ });
  const snowball = canvas.getByRole("radio", { name: /Snowball/ });
  await expect(avalanche).toBeChecked();
  await userEvent.tab();
  await expect(avalanche).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}");
  await expect(snowball).toHaveFocus();
  await expect(snowball).toBeChecked();
  await userEvent.keyboard("{ArrowUp}");
  await expect(avalanche).toBeChecked();
  await userEvent.click(snowball);
  await expect(snowball).toBeChecked();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

export const Disabled: Story = { args: { disabled: true }, globals: { theme: "dark" } };

export const DisabledOption: Story = {
  args: {
    options: [
      { value: "avalanche", label: "Avalanche", description: "Pay the highest rate first" },
      { value: "snowball", label: "Snowball", description: "Smallest balance first" },
      {
        value: "custom",
        label: "Custom order",
        description: "Available once you have added three debts",
        disabled: true,
      },
    ],
  },
  globals: { theme: "light" },
};

export const ErrorState: Story = {
  args: { defaultValue: undefined, error: "Choose a payoff strategy to continue" },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveTextContent(/Choose a payoff/);
  },
};

export const ErrorDark: Story = {
  args: { defaultValue: undefined, error: "Choose a payoff strategy to continue" },
  globals: { theme: "dark" },
};

const longOptions: RadioCardOption[] = [
  {
    value: "avalanche",
    label: "Avalanche, highest interest rate first across all four cards",
    description:
      "Put every spare £1,250.00 towards the Barclaycard Platinum at 24.9% APR until it clears, then roll the freed-up payment into the next card",
    badge: "Saves £2,184.60 interest",
  },
  {
    value: "snowball",
    label: "Snowball, smallest balance first",
    description:
      "Clear the £312.40 store card in about two months, then the next smallest, so you see debts disappearing early",
    badge: "Debt-free 3 months later",
  },
];

export const LongContent: Story = {
  args: { options: longOptions },
  globals: { theme: "light" },
};
