import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Lightbulb } from "lucide-react";
import { Button } from "../../primitives/Button/Button";
import { Icon } from "../../primitives/Icon/Icon";
import { CoachCard } from "./CoachCard";

const onDismiss = fn();
const onPrimary = fn();

const meta: Meta<typeof CoachCard> = {
  title: "3. Financial Patterns & Sections/CoachCard",
  component: CoachCard,
  parameters: { layout: "padded" },
  args: {
    eyebrow: "Next best step",
    title: "Claim your full employer pension match",
    description:
      "Your employer matches contributions up to 5% of salary. You currently contribute 3%, so you may be leaving up to £1,300 a year unclaimed.",
    headingLevel: "h2",
    icon: <Icon icon={Lightbulb} />,
    primaryAction: <Button onClick={onPrimary}>Review contributions</Button>,
    secondaryAction: <Button variant="secondary">Remind me later</Button>,
    onDismiss,
    dismissLabel: "Dismiss suggestion",
  },
};

export default meta;
type Story = StoryObj<typeof CoachCard>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("region", { name: "Claim your full employer pension match" }),
  ).toBeInTheDocument();

  // Keyboard focus order: primary, secondary, then dismiss.
  await userEvent.tab();
  await expect(canvas.getByRole("button", { name: "Review contributions" })).toHaveFocus();
  await userEvent.tab();
  await expect(canvas.getByRole("button", { name: "Remind me later" })).toHaveFocus();
  await userEvent.tab();
  const dismiss = canvas.getByRole("button", { name: "Dismiss suggestion" });
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
