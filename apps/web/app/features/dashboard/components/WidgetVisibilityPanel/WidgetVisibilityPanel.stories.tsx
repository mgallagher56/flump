import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import type { DashboardWidgetKey } from "~/utils/pageConfig";
import { WidgetVisibilityPanel } from "./WidgetVisibilityPanel";

const meta: Meta<typeof WidgetVisibilityPanel> = {
  title: "3. Financial Patterns & Sections/WidgetVisibilityPanel",
  component: WidgetVisibilityPanel,
  parameters: { layout: "padded" },
  args: {
    open: true,
    widgetKeys: ["accounts", "budget", "debt", "savings"],
    visibleKeys: ["accounts", "budget"],
    error: null,
  },
  render: (args) => {
    const [visible, setVisible] = useState<DashboardWidgetKey[]>(args.visibleKeys);
    return (
      <WidgetVisibilityPanel
        {...args}
        visibleKeys={visible}
        onToggle={(key) =>
          setVisible((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
          )
        }
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof WidgetVisibilityPanel>;

// The dialog renders in a portal, so queries run against the document body.
export const ToggleVisibility: Story = {
  play: async () => {
    const body = within(document.body);
    const [debt] = await body.findAllByRole("checkbox", { name: /^Debt/ });
    if (!debt) throw new Error("Debt checkbox missing");
    await expect((debt as HTMLInputElement).checked).toBe(false);
    await userEvent.click(debt);
    await expect((debt as HTMLInputElement).checked).toBe(true);
  },
};

export const WithError: Story = {
  args: { error: "We could not save that change. Try again." },
};
