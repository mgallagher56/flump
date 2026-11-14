import type { Meta, StoryObj } from "@storybook/react";
import type { FC } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { CHECK_IN_ACCOUNTS, CHECK_IN_DETAILS } from "../../fixtures";
import { useCheckIn } from "../../useCheckIn";
import type { SaveSnapshot } from "../../useSaveSnapshot";
import { CheckInStep, type CheckInStepLayout } from "./CheckInStep";

interface DemoProps {
  accountId: string;
  layout: CheckInStepLayout;
  onSave: SaveSnapshot;
}

const Demo: FC<DemoProps> = ({ accountId, layout, onSave }) => {
  const checkIn = useCheckIn({
    accounts: CHECK_IN_ACCOUNTS,
    accountDetails: CHECK_IN_DETAILS,
    month: "2026-11",
    open: true,
    onSave,
  });
  const step = checkIn.steps.find((s) => s.accountId === accountId);
  if (!step) return null;
  return (
    <CheckInStep
      checkIn={checkIn}
      layout={layout}
      onAnswer={(s, a) => void checkIn.confirm(s, a)}
      onRetry={(s) => void checkIn.retry(s)}
      step={step}
    />
  );
};

const [everyday, , mortgage] = CHECK_IN_ACCOUNTS.map((a) => a.id) as [string, string, string];

const meta: Meta<typeof Demo> = {
  title: "3. Patterns/Snapshot/CheckInStep",
  component: Demo,
  parameters: { layout: "padded" },
  args: { accountId: everyday, layout: "card", onSave: fn(async () => true) },
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const Update: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("textbox", { name: /New balance/ }), "3400");
    await userEvent.click(canvas.getByRole("button", { name: "Update" }));
    await expect(await canvas.findByText("Updated £3,400")).toBeDefined();
  },
};

export const UpdateDark: Story = { ...Update, globals: { theme: "dark" } };

export const Calculated: Story = {
  args: { accountId: mortgage },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Calculated")).toBeDefined();
    await userEvent.click(canvas.getByRole("button", { name: "Keep this figure" }));
    await expect(await canvas.findByText("Calculated £186,000")).toBeDefined();
  },
};

export const CalculatedDark: Story = { ...Calculated, globals: { theme: "dark" } };

export const SaveFailed: Story = {
  args: { onSave: fn(async () => false) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "No change" }));
    await expect(
      await canvas.findByText("We could not save this balance. Nothing has changed. Try again."),
    ).toBeDefined();
  },
};

export const SaveFailedDark: Story = { ...SaveFailed, globals: { theme: "dark" } };
