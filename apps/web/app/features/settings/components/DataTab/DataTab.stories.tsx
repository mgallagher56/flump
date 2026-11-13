import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { DataTab } from "./DataTab";

const meta: Meta<typeof DataTab> = {
  title: "3. Financial Patterns & Sections/Settings/DataTab",
  component: DataTab,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof DataTab>;

export const Default: Story = {};

export const ResetDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTestId("reset-financial-data-trigger"));
    const dialog = within(document.body);
    const confirm = (await dialog.findByRole("button", {
      name: "Reset everything",
    })) as HTMLButtonElement;
    await expect(confirm.disabled).toBe(true);
    await userEvent.type(dialog.getByLabelText(/to confirm/i), "RESET");
    await expect(confirm.disabled).toBe(false);
  },
};
