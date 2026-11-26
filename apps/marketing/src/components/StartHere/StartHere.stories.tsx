import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { START_HERE } from "../../utils/featureIndex";
import { StartHere } from "./StartHere";

const meta: Meta<typeof StartHere> = {
  title: "3. Patterns/Marketing/StartHere",
  component: StartHere,
};

export default meta;
type Story = StoryObj<typeof StartHere>;

const assertGoals: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const nav = canvas.getByRole("navigation", { name: "Start here" });
  for (const entry of START_HERE) await expect(within(nav).getByText(entry.goal)).toBeVisible();
  await expect(within(nav).getByRole("link", { name: "Breathing room" })).toHaveAttribute(
    "href",
    "#breathing-room",
  );
};

export const Light: Story = { globals: { theme: "light" }, play: assertGoals };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertGoals,
};
