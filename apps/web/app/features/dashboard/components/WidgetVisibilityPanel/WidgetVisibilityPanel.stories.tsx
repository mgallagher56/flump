import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import type { DashboardWidgetKey } from "~/utils/pageConfig";
import { moveSection, SECTION_PRIORITY } from "../../sectionOrder";
import { WidgetVisibilityPanel } from "./WidgetVisibilityPanel";

const meta: Meta<typeof WidgetVisibilityPanel> = {
  title: "3. Patterns/Dashboard/WidgetVisibilityPanel",
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
    const [debt] = await body.findAllByRole("checkbox", { name: /^Cards and loans/ });
    if (!debt) throw new Error("Cards and loans checkbox missing");
    await expect((debt as HTMLInputElement).checked).toBe(false);
    await userEvent.click(debt);
    await expect((debt as HTMLInputElement).checked).toBe(true);
  },
};

export const WithError: Story = {
  args: { error: "We could not save that change. Try again." },
};

/** Move up and move down on every row, a reset, and a status line that says where a row went. */
export const Reorder: Story = {
  render: () => {
    const [order, setOrder] = useState<DashboardWidgetKey[]>([...SECTION_PRIORITY]);
    return (
      <WidgetVisibilityPanel
        open
        orderIsDefault={order.join() === SECTION_PRIORITY.join()}
        shownKeys={order.slice(0, 4)}
        visibleKeys={order.slice(0, 5)}
        widgetKeys={order}
        onMove={(key, offset) => setOrder((o) => moveSection(o, key, offset))}
        onOpenChange={() => undefined}
        onResetOrder={() => setOrder([...SECTION_PRIORITY])}
        onToggle={() => undefined}
      />
    );
  },
  play: async () => {
    const body = within(document.body);
    const [up] = await body.findAllByRole("button", { name: "Move Budget up" });
    if (!up) throw new Error("Move Budget up missing");
    await userEvent.click(up);
    const rows = body
      .getAllByRole("checkbox")
      .map((box) => box.id.replace(/^widget-visibility-/, ""));
    await expect(rows.indexOf("budget")).toBeLessThan(rows.indexOf("tax"));
    await expect(document.activeElement).toBe(up);
  },
};
