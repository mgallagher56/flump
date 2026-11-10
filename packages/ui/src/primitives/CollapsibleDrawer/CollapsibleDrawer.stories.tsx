import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { CollapsibleDrawer } from "./CollapsibleDrawer";

const meta: Meta<typeof CollapsibleDrawer> = {
  title: "2. Primitives/CollapsibleDrawer",
  component: CollapsibleDrawer,
  parameters: {
    layout: "centered",
  },
  args: {
    title: "Detailed Amortisation Ledger",
    subtitle: "Month-by-month capital vs. interest amortization",
    children: (
      <div style={{ padding: "8px", fontSize: "13px" }}>
        Month 1: Capital £450 | Interest £85 | Remaining: £14,200
      </div>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof CollapsibleDrawer>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /detailed amortisation ledger/i });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText(/Month 1: Capital £450/i)).toBeInTheDocument();
  },
};
