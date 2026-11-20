import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import type { FetcherOutcomeStatus } from "~/features/feedback/hooks/useFetcherOutcome";
import { QuickBalanceUpdate, type QuickBalanceUpdateProps } from "./QuickBalanceUpdate";

/** A save that succeeds (or with `fail`, fails) straight away, as the page's fetcher would. */
const Live = ({
  fail = false,
  ...props
}: Omit<QuickBalanceUpdateProps, "onSave" | "status" | "error"> & { fail?: boolean }) => {
  const [status, setStatus] = useState<FetcherOutcomeStatus>("idle");
  return (
    <QuickBalanceUpdate
      {...props}
      error={status === "failed" ? "We could not save that. Try again." : null}
      onSave={() => {
        setStatus("pending");
        setTimeout(() => setStatus(fail ? "failed" : "succeeded"), 0);
      }}
      status={status}
    />
  );
};

const meta: Meta<typeof Live> = {
  title: "3. Patterns/Accounts/QuickBalanceUpdate",
  component: Live,
  parameters: { layout: "padded" },
  args: { accountName: "Holiday fund", current: 500, isLiability: false },
};

export default meta;
type Story = StoryObj<typeof Live>;

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Update balance" })).toBeDefined();
  },
};

/** Open, Enter saves, and focus goes back to the button. */
export const UpdateWithEnter: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Update balance" }));
    const field = canvas.getByRole("textbox", { name: "New balance" });
    await expect(document.activeElement).toBe(field);
    await userEvent.clear(field);
    await userEvent.type(field, "750{Enter}");
    const button = await canvas.findByRole("button", { name: "Update balance" });
    await expect(document.activeElement).toBe(button);
  },
};

export const OpenForADebt: Story = {
  args: { accountName: "Barclaycard", current: 1200, isLiability: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Update amount owed" }));
    await expect(canvas.getByRole("textbox", { name: "Amount owed now" })).toBeDefined();
  },
};

export const OpenWithJointNote: Story = {
  args: { hint: "Enter the whole balance. Your share is counted in net worth." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Update balance" }));
    await expect(canvas.getByText(/Enter the whole balance/)).toBeDefined();
  },
};

export const SaveFailed: Story = {
  args: { fail: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Update balance" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "New balance" }), "{Enter}");
    await expect(await canvas.findByRole("alert")).toBeDefined();
  },
};
