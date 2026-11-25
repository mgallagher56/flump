import { UK_PENSION_INHERITANCE_RULES } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { UnusedPensionSavings } from "./UnusedPensionSavings";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof UnusedPensionSavings> = {
  title: "3. Patterns/Retirement/UnusedPensionSavings",
  component: UnusedPensionSavings,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof UnusedPensionSavings>;

const openPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const trigger = canvas.getAllByRole("button", {
    name: /What happens to unused pension savings/,
  })[0];
  if (!trigger) throw new Error("no trigger");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(trigger);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
};

/** Before 6 April 2027: the rules are law but do not apply yet. */
export const BeforeApril2027: Story = {
  args: { todayIso: "2026-11-25" },
  play: openPlay,
};

/** From 6 April 2027 the "not before" line goes. */
export const InForce: Story = {
  args: { todayIso: "2027-04-06" },
  play: openPlay,
};

/** If the rules were ever set back to draft, the section says they are not yet law. */
export const NotYetLaw: Story = {
  args: { todayIso: "2026-11-25", rules: { ...UK_PENSION_INHERITANCE_RULES, status: "draft" } },
  play: async (context) => {
    await openPlay(context);
    const canvas = within(context.canvasElement);
    await expect(
      canvas.getAllByText(
        "These rules are proposed and not yet law. They may change before 6 April 2027.",
      )[0],
    ).toBeInTheDocument();
  },
};
