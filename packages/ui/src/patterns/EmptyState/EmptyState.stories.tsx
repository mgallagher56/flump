import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Button } from "../../primitives/Button/Button";
import { EmptyState } from "./EmptyState";

const onAction = fn();

const meta: Meta<typeof EmptyState> = {
  title: "3. Financial Patterns & Sections/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "padded",
  },
  args: {
    title: "No debts yet",
    description: "Add your credit cards, loans and overdrafts to compare payoff plans.",
    action: (
      <Button onClick={onAction} size="sm">
        Add debt
      </Button>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { name: "No debts yet" })).toBeInTheDocument();
  await userEvent.click(canvas.getByRole("button", { name: "Add debt" }));
  await expect(onAction).toHaveBeenCalled();
};

export const Light: Story = {
  globals: { theme: "light" },
  play,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play,
};

export const TitleOnly: Story = {
  args: { description: undefined, action: undefined },
  globals: { theme: "light" },
};
