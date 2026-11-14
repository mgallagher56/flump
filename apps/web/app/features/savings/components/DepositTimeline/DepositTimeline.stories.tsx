import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { DepositTimeline, type DepositTimelineValues } from "./DepositTimeline";

const Stateful = ({ initial }: { initial: DepositTimelineValues }) => {
  const [values, setValues] = useState(initial);
  return (
    <DepositTimeline
      values={values}
      onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
    />
  );
};

const meta: Meta<typeof Stateful> = {
  title: "3. Financial Patterns & Sections/DepositTimeline",
  component: Stateful,
  parameters: { layout: "padded" },
  args: { initial: { targetDeposit: null, monthlySaving: 400, startingAmount: 5000 } },
};

export default meta;
type Story = StoryObj<typeof Stateful>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const target = canvas.getAllByLabelText("Target amount")[0];
    if (!target) throw new Error("Target amount field missing");
    await expect(target).toHaveValue("");
    await userEvent.type(target, "20000");
    await expect(
      canvas.getAllByText("Estimated time to reach target: 3 years 2 months").length,
    ).toBeGreaterThan(0);
  },
};

export const WithTarget: Story = {
  args: { initial: { targetDeposit: 25000, monthlySaving: 600, startingAmount: 8000 } },
};

export const AlreadyReached: Story = {
  args: { initial: { targetDeposit: 4000, monthlySaving: 200, startingAmount: 5000 } },
};

export const NoMonthlySaving: Story = {
  args: { initial: { targetDeposit: 25000, monthlySaving: null, startingAmount: 5000 } },
};

export const Dark: Story = { ...WithTarget, globals: { theme: "dark" } };
