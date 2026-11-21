import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { AccountGoalSection } from "./AccountGoalSection";

const meta: Meta<typeof AccountGoalSection> = {
  title: "3. Patterns/Accounts/AccountGoalSection",
  component: AccountGoalSection,
  parameters: { layout: "padded" },
  args: {
    currentBalance: 350,
    isLiability: false,
    earliestRecord: { value: 50, month: 1, year: 2026 },
    goal: {
      id: "goal-1",
      accountId: "acc-1",
      targetAmount: 1000,
      targetDate: "2027-06-01",
      label: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    onSave: fn(),
    onRemove: fn(),
    status: "idle",
  },
};

export default meta;
type Story = StoryObj<typeof AccountGoalSection>;

export const WithGoal: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Goal: £1,000 in this account by June 2027.")).toBeDefined();
    await expect(canvas.getByText("Balance changed by +£300 since January.")).toBeDefined();
    await userEvent.click(canvas.getByRole("button", { name: "Remove goal" }));
    await expect(args.onRemove).toHaveBeenCalledOnce();
  },
};

export const WithGoalDark: Story = { ...WithGoal, globals: { theme: "dark" } };

export const DebtReached: Story = {
  args: {
    currentBalance: 0,
    isLiability: true,
    earliestRecord: { value: 1800, month: 1, year: 2026 },
    goal: {
      id: "goal-2",
      accountId: "acc-2",
      targetAmount: 0,
      targetDate: "2027-03-01",
      label: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("£1,800 paid off since January.")).toBeDefined();
    await expect(canvas.getByText("Balance £0. You set this goal for March 2027.")).toBeDefined();
  },
};

export const DebtReachedDark: Story = { ...DebtReached, globals: { theme: "dark" } };

export const NoGoal: Story = {
  args: {
    goal: null,
  },
};

export const NoGoalDark: Story = { ...NoGoal, globals: { theme: "dark" } };
