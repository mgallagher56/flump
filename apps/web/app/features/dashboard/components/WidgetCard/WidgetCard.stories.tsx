import type { Meta, StoryObj } from "@storybook/react";
import { Landmark } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import { WidgetCard } from "./WidgetCard";

const meta: Meta<typeof WidgetCard> = {
  title: "3. Financial Patterns & Sections/WidgetCard",
  component: WidgetCard,
  parameters: { layout: "padded" },
  args: {
    id: "accounts",
    title: "Accounts",
    icon: Landmark,
    href: "/app/accounts",
    onHide: fn(),
    children: "Widget content goes here.",
  },
};

export default meta;
type Story = StoryObj<typeof WidgetCard>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const WithHide: Story = {
  play: async ({ canvasElement, args }) => {
    const hide = within(canvasElement).getAllByRole("button", {
      name: "Hide Accounts",
    })[0];
    if (!hide) throw new Error("Hide button missing");
    await userEvent.click(hide);
    await expect(args.onHide).toHaveBeenCalled();
  },
};

export const WithoutHide: Story = {
  args: { onHide: undefined },
};
