import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { type TabItem, Tabs, type TabsSize } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "2. Primitives/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
  },
  args: {
    "aria-label": "Payoff method",
    items: [
      { value: "avalanche", label: "Avalanche" },
      { value: "snowball", label: "Snowball" },
      { value: "minimum", label: "Minimum only" },
    ],
    value: "avalanche",
    onValueChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const avalancheTab = canvas.getByRole("tab", { name: "Avalanche" });
    const snowballTab = canvas.getByRole("tab", { name: "Snowball" });

    await expect(avalancheTab).toHaveAttribute("aria-selected", "true");
    await expect(snowballTab).toHaveAttribute("aria-selected", "false");

    await userEvent.click(snowballTab);
    await expect(args.onValueChange).toHaveBeenCalledWith("snowball");
  },
};

export const DefaultDark: Story = { ...Default, globals: { theme: "dark" } };

export const Small: Story = { args: { size: "sm", "aria-label": "Scenario tools" } };

const SETS: { label: string; items: TabItem[] }[] = [
  {
    label: "Two views",
    items: [
      { value: "chart", label: "Chart" },
      { value: "table", label: "Table" },
    ],
  },
  {
    label: "Three tools",
    items: [
      { value: "overpayment", label: "Overpayment" },
      { value: "rate-change", label: "Rate change" },
      { value: "overpay-vs-save", label: "Overpay or save" },
    ],
  },
  {
    label: "Four sections",
    items: [
      { value: "income-tax", label: "Income tax" },
      { value: "national-insurance", label: "National Insurance" },
      { value: "student-loan", label: "Student loan" },
      { value: "self-assessment", label: "Self assessment" },
    ],
  },
];

const stack = css({ display: "grid", gap: "6", width: "100%", maxWidth: "343px" });
const caption = css({ textStyle: "body.sm", color: "text.secondary", margin: "0", mb: "2" });

const ControlledTabs = ({
  items,
  label,
  size,
}: {
  items: TabItem[];
  label: string;
  size: TabsSize;
}) => {
  const [value, setValue] = useState(items[0]?.value ?? "");
  return (
    <div>
      <p className={caption}>{label}</p>
      <Tabs aria-label={label} items={items} size={size} value={value} onValueChange={setValue} />
    </div>
  );
};

const ItemCountsGrid = () => (
  <div className={stack}>
    {SETS.map((set) => (
      <ControlledTabs items={set.items} key={set.label} label={set.label} size="md" />
    ))}
    <ControlledTabs items={SETS[1]?.items ?? []} label="Three tools, small" size="sm" />
  </div>
);

const itemCountsPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("tablist")).toHaveLength(4);

  // Click selection.
  const table = canvas.getByRole("tab", { name: "Table" });
  await userEvent.click(table);
  await expect(table).toHaveAttribute("aria-selected", "true");

  // Arrow keys move focus and select (automatic activation), wrapping at the end.
  const four = within(canvas.getByRole("tablist", { name: "Four sections" }));
  four.getByRole("tab", { name: "Income tax" }).focus();
  await userEvent.keyboard("{ArrowRight}");
  const ni = four.getByRole("tab", { name: "National Insurance" });
  await expect(ni).toHaveFocus();
  await expect(ni).toHaveAttribute("aria-selected", "true");
  await userEvent.keyboard("{End}");
  const last = four.getByRole("tab", { name: "Self assessment" });
  await expect(last).toHaveFocus();
  // Focus never replaces the selected pill: the focused, selected tab keeps its card fill.
  const fourList = canvas.getByRole("tablist", { name: "Four sections" });
  await expect(getComputedStyle(last).backgroundColor).not.toBe(
    getComputedStyle(fourList).backgroundColor,
  );
  await expect(getComputedStyle(last).outlineStyle).toBe("solid");

  // Scroll cue: a clipped edge fades; a list that fits has no fade.
  const scrollerOf = (name: string) =>
    canvas.getByRole("tablist", { name }).parentElement as HTMLElement;
  await expect(scrollerOf("Two views")).not.toHaveAttribute("data-overflow-end");
  await expect(scrollerOf("Two views")).not.toHaveAttribute("data-overflow-start");
  await waitFor(() => expect(scrollerOf("Three tools")).toHaveAttribute("data-overflow-end"));
  await expect(getComputedStyle(scrollerOf("Three tools")).maskImage).toContain("gradient");
  // Scrolled to the last tab: the start edge hides tabs, the end edge does not.
  await waitFor(() => expect(scrollerOf("Four sections")).toHaveAttribute("data-overflow-start"));
  await expect(scrollerOf("Four sections")).not.toHaveAttribute("data-overflow-end");

  // No tab list widens the page on a small phone (mobile1, 320px): the track (the `tablist`) may be
  // wider than the screen, but it scrolls inside its scroller, and the scroller stays on screen.
  for (const list of canvas.getAllByRole("tablist")) {
    const scroller = list.parentElement as HTMLElement;
    await expect(scroller).toHaveAttribute("data-tabs-scroller");
    await expect(scroller.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
  }
  await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  // Each Tabs root stays within its parent's width, however long its list.
  for (const list of canvas.getAllByRole("tablist")) {
    const root = list.parentElement?.parentElement as HTMLElement;
    const parent = root.parentElement as HTMLElement;
    await expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(
      parent.getBoundingClientRect().width + 0.5,
    );
  }
};

/** Two, three and four items on a small phone (mobile1, 320px; the maximum is four), plus the small size. */
export const ItemCounts: Story = {
  render: () => <ItemCountsGrid />,
  parameters: { layout: "padded", viewport: { defaultViewport: "mobile1" } },
  play: itemCountsPlay,
};

export const ItemCountsDark: Story = { ...ItemCounts, globals: { theme: "dark" } };

const PageTabs = () => {
  const [value, setValue] = useState("overview");
  return (
    <Tabs
      aria-label="Account sections"
      value={value}
      onValueChange={setValue}
      items={[
        { value: "overview", label: "Overview" },
        { value: "activity", label: "Activity" },
        { value: "settings", label: "Settings" },
      ]}
      panels={{
        overview: <p>Your balances and upcoming payments are summarised here.</p>,
        activity: <p>Recent transactions appear here once you add them.</p>,
        settings: <p>Choose which accounts count towards your totals.</p>,
      }}
    />
  );
};

/** Page tabs with real panels: aria-controls resolves, so axe reports no dangling references. */
export const WithPanels: Story = {
  render: () => <PageTabs />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overview = canvas.getByRole("tab", { name: "Overview" });
    const panelId = overview.getAttribute("aria-controls");
    await expect(panelId).toBeTruthy();
    await expect(canvas.getByRole("tabpanel", { name: "Overview" })).toHaveAttribute(
      "id",
      panelId ?? "",
    );
    await userEvent.click(canvas.getByRole("tab", { name: "Activity" }));
    await expect(canvas.getByRole("tabpanel", { name: "Activity" })).toBeInTheDocument();
    overview.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("tab", { name: "Activity" })).toHaveFocus();
  },
};

/** Composed with `Tabs.Panel` children instead of the `panels` prop. */
export const WithPanelChildren: Story = {
  render: () => (
    <Tabs
      aria-label="Report"
      value="a"
      onValueChange={() => undefined}
      items={[
        { value: "a", label: "Summary" },
        { value: "b", label: "Detail" },
      ]}
    >
      <Tabs.Panel value="a">Summary content</Tabs.Panel>
      <Tabs.Panel value="b">Detail content</Tabs.Panel>
    </Tabs>
  ),
};

/** Manual activation: arrows move focus, Enter selects. For tabs where switching has a cost. */
export const ManualActivation: Story = {
  args: { activationMode: "manual", "aria-label": "Manual activation" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("tab", { name: "Avalanche" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("tab", { name: "Snowball" })).toHaveFocus();
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};
