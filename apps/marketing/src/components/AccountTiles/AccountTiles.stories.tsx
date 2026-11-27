import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AccountTiles } from "./AccountTiles";

const meta: Meta<typeof AccountTiles> = {
  title: "3. Patterns/Marketing/AccountTiles",
  component: AccountTiles,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className={css({ maxWidth: "640px" })}>
        <Story />
      </div>
    ),
  ],
  args: {
    tiles: [
      { id: "cash", name: "Cash and savings", amount: 21_000, owed: false },
      { id: "pension", name: "Pension", amount: 96_000, owed: false },
      { id: "home", name: "Home (your estimate)", amount: 310_000, owed: false },
      { id: "mortgage", name: "Mortgage", amount: 186_000, owed: true },
      { id: "card", name: "Credit card", amount: 1_800, owed: true },
      { id: "loan", name: "Personal loan", amount: 7_200, owed: true },
    ],
    netWorth: 232_000,
  },
};

export default meta;
type Story = StoryObj<typeof AccountTiles>;

const assertTiles: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("listitem")).toHaveLength(6);
  await expect(canvas.getByText("Example")).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertTiles };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertTiles,
};
