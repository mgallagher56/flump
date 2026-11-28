import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MoneyPiece } from "./MoneyPieces";

const KEYS = ["card", "payslip", "receipt", "statement", "pension", "credit"] as const;

const meta: Meta<typeof MoneyPiece> = {
  title: "3. Patterns/Marketing/MoneyPieces",
  component: MoneyPiece,
  parameters: { layout: "padded" },
  args: { k: "card" },
  render: () => (
    <div className={css({ display: "flex", flexWrap: "wrap", gap: "6", alignItems: "flex-start" })}>
      {KEYS.map((k) => (
        <MoneyPiece k={k} key={k} />
      ))}
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof MoneyPiece>;

const assertPieces: Story["play"] = async ({ canvasElement }) => {
  await expect(within(canvasElement).getAllByText("Example", { exact: true })).toHaveLength(6);
};

export const Light: Story = { globals: { theme: "light" }, play: assertPieces };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPieces,
};
