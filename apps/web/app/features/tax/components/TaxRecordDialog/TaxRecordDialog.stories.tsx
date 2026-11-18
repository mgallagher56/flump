import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { AppBottomBar } from "~/components/navigation/AppBottomBar/AppBottomBar";
import { TaxRecordDialog, type TaxRecordDraft } from "./TaxRecordDialog";

const draft: TaxRecordDraft = {
  name: "",
  source: "self-employed",
  type: "expense",
  category: "office_costs",
  amount: null,
  date: "2026-04-06",
  frequency: "monthly",
  endDate: "",
  notes: "",
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  receiptCleared: false,
};

const meta: Meta<typeof TaxRecordDialog> = {
  title: "3. Patterns/Tax/TaxRecordDialog",
  component: TaxRecordDialog,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
    router: { location: { pathname: "/app/tax", search: "", hash: "", state: null, key: "tax" } },
  },
  args: { open: true, mode: "add", initial: draft, onOpenChange: fn(), onSave: fn() },
  // The app's bottom bar sits under the dialog, as on a phone, so any overlap shows up here.
  render: (args) => (
    <>
      <AppBottomBar user={{ id: "1" }} />
      <TaxRecordDialog {...args} />
    </>
  ),
};
export default meta;
type Story = StoryObj<typeof TaxRecordDialog>;

const play: Story["play"] = async () => {
  const dialog = within(document.body).getByRole("dialog");
  const scope = within(dialog);
  // Amount is the second field, straight after the name (R2-8).
  const fields = [...dialog.querySelectorAll("input, select")];
  await expect(fields[1]).toBe(scope.getByLabelText(/^Amount/));
  // The actions stay in view and nothing (the bottom bar included) draws over them.
  const save = scope.getByRole("button", { name: "Add record" });
  const box = save.getBoundingClientRect();
  await expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
  const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  await expect(save.contains(top)).toBe(true);
  // Category and notes wait under a toggle named for them.
  await userEvent.click(scope.getByRole("button", { name: "Category and notes" }));
  // The drawer body fades in, so wait for it.
  await waitFor(() => expect(scope.getByLabelText("Category")).toBeVisible());
};

export const AddOnPhone: Story = { globals: { theme: "light" }, play };

export const AddOnPhoneDark: Story = { globals: { theme: "dark" }, play };
