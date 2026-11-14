import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { NetWorthChoices } from "./NetWorthChoices";

const meta: Meta<typeof NetWorthChoices> = {
  title: "3. Patterns/Settings/NetWorthChoices",
  component: NetWorthChoices,
  parameters: { layout: "padded" },
  args: { countProperty: true, countStudentLoan: false, onSave: fn(async () => undefined) },
};

export default meta;
type Story = StoryObj<typeof NetWorthChoices>;

export const Defaults: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const studentLoan = canvas.getByRole("switch", {
      name: "Count my student loan as a debt in my net worth.",
    });
    await userEvent.click(studentLoan);
    await expect(args.onSave).toHaveBeenCalledWith({ netWorthCountsStudentLoan: true });
  },
};

export const BothOff: Story = {
  args: { countProperty: false, countStudentLoan: false },
};

export const SaveFails: Story = {
  args: { onSave: fn(async () => Promise.reject(new Error("failed"))) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("switch", {
        name: "Count property I own, less the mortgage on it, in my net worth.",
      }),
    );
    await expect(await canvas.findByRole("alert")).toBeDefined();
  },
};
