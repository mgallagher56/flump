import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { FEATURE_GROUPS } from "../../utils/featureIndex";
import { FeatureIndex } from "./FeatureIndex";

const meta: Meta<typeof FeatureIndex> = {
  title: "3. Patterns/Marketing/FeatureIndex",
  component: FeatureIndex,
  args: { groupHrefs: { budget: "/features/budget", pay: "/features/pay" } },
};

export default meta;
type Story = StoryObj<typeof FeatureIndex>;

/** Opens a line from the keyboard and checks its detail and link appear. */
const openWithKeyboard: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("heading", { level: 2 })).toHaveLength(FEATURE_GROUPS.length);
  const details = canvasElement.querySelector<HTMLDetailsElement>("#breathing-room");
  const summary = details?.querySelector("summary");
  if (!details || !summary) throw new Error("breathing-room line missing");
  summary.focus();
  await userEvent.keyboard("{Enter}");
  await expect(details.open).toBe(true);
  await expect(
    within(details).getByRole("link", { name: "More on the Budget page" }),
  ).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: openWithKeyboard };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: openWithKeyboard,
};
