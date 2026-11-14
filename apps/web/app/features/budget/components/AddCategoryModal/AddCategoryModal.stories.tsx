import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { AddCategoryModal } from "./AddCategoryModal";

const meta: Meta<typeof AddCategoryModal> = {
  title: "3. Patterns/Budget/AddCategoryModal",
  component: AddCategoryModal,
  parameters: { layout: "padded" },
  args: {
    open: true,
    onClose: fn(),
    onAddCategory: fn(),
    existingCategories: ["housing", "bills", "pets"],
  },
};

export default meta;
type Story = StoryObj<typeof AddCategoryModal>;

export const Default: Story = {
  play: async ({ args }) => {
    const dialog = within(document.body);
    await userEvent.click(await dialog.findByRole("button", { name: "Holidays" }));
    await userEvent.click(dialog.getByRole("button", { name: "Add category" }));
    await expect(args.onAddCategory).toHaveBeenCalledWith("Holidays");
  },
};
