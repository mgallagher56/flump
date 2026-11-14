import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Lightbulb } from "lucide-react";
import { Button } from "../../primitives/Button/Button";
import { Icon } from "../../primitives/Icon/Icon";
import { CoachCard } from "./CoachCard";

const onDismiss = fn();
const onPrimary = fn();

const meta: Meta<typeof CoachCard> = {
  title: "3. Patterns/CoachCard",
  component: CoachCard,
  parameters: { layout: "padded" },
  args: {
    eyebrow: "Housekeeping",
    title: "Finish setting up",
    description:
      "Two details are missing: your workplace pension balance and the interest rate on one card. Adding them makes your totals more complete. No pressure, you can change this any time.",
    headingLevel: "h2",
    icon: <Icon icon={Lightbulb} />,
    primaryAction: <Button onClick={onPrimary}>Add missing details</Button>,
    secondaryAction: <Button variant="secondary">Not now</Button>,
    onDismiss,
    dismissLabel: "Dismiss reminder",
  },
};

export default meta;
type Story = StoryObj<typeof CoachCard>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("region", { name: "Finish setting up" })).toBeInTheDocument();

  // Keyboard focus order: primary, secondary, then dismiss.
  await userEvent.tab();
  await expect(canvas.getByRole("button", { name: "Add missing details" })).toHaveFocus();
  await userEvent.tab();
  await expect(canvas.getByRole("button", { name: "Not now" })).toHaveFocus();
  await userEvent.tab();
  const dismiss = canvas.getByRole("button", { name: "Dismiss reminder" });
  await expect(dismiss).toHaveFocus();

  await userEvent.keyboard("{Enter}");
  await expect(onDismiss).toHaveBeenCalled();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

export const NoDismissOrSecondary: Story = {
  args: { onDismiss: undefined, secondaryAction: undefined, eyebrow: undefined },
  globals: { theme: "light" },
};
