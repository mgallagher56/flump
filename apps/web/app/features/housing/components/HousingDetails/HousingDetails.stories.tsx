import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { HousingDetails } from "./HousingDetails";

const meta: Meta<typeof HousingDetails> = {
  title: "3. Patterns/Housing/HousingDetails",
  component: HousingDetails,
  parameters: { layout: "padded" },
  args: {
    housingStatus: "renting",
    savedAmount: 900,
    onSave: fn().mockResolvedValue(undefined),
  },
};

export default meta;
type Story = StoryObj<typeof HousingDetails>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Renting: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const edit = canvas.getAllByRole("button", { name: "Edit your rent" })[0];
    if (!edit) throw new Error("Edit button missing");
    await userEvent.click(edit);
    await expect(
      within(canvasElement.ownerDocument.body).getAllByLabelText("Rent each month")[0],
    ).toBeDefined();
  },
};

export const LivingWithFamily: Story = {
  args: { housingStatus: "living_with_family", savedAmount: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const edit = canvas.getAllByRole("button", { name: "Edit what you pay" })[0];
    if (!edit) throw new Error("Edit button missing");
    await userEvent.click(edit);
    await expect(
      within(canvasElement.ownerDocument.body).getAllByLabelText("What you pay each month")[0],
    ).toBeDefined();
  },
};

export const Mortgage: Story = {
  args: { housingStatus: "mortgage", savedAmount: 1100 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Open the mortgage page")[0]).toBeDefined();
  },
};

export const NotSet: Story = {
  args: { housingStatus: null, savedAmount: null },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByRole("button", { name: "Add your rent" })[0],
    ).toBeDefined();
  },
};
