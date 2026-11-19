import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { CalculatedFigures } from "./CalculatedFigures";

const meta: Meta<typeof CalculatedFigures> = {
  title: "3. Patterns/Tax/CalculatedFigures",
  component: CalculatedFigures,
  parameters: { layout: "padded" },
  args: {
    taxYear: "2026/27",
    onAdd: fn(),
    offers: [
      {
        kind: "mortgage_interest",
        accountId: "m1",
        accountName: "Flat 2 mortgage",
        ratePct: 4.5,
        amount: 6750,
        sharePercent: 100,
      },
      {
        kind: "savings_interest",
        accountId: "s1",
        accountName: "Easy access",
        ratePct: 4,
        amount: 785.7,
        sharePercent: 50,
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof CalculatedFigures>;

const play: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText(/£6,750\.00/)).toBeTruthy();
  await userEvent.click(canvas.getByRole("button", { name: /^Add as a record: Flat 2 mortgage/ }));
  await expect(args.onAdd).toHaveBeenCalledWith(expect.objectContaining({ accountId: "m1" }));
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

export const Saving: Story = {
  args: { pending: true },
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole("button", { name: /^Add as a record/ });
    for (const button of buttons) await expect(button).toBeDisabled();
  },
};
