import type { Meta, StoryObj } from "@storybook/react";
import { PiggyBank } from "lucide-react";
import { expect, within } from "storybook/test";
import { SampleModeProvider } from "~/context/SampleModeContext";
import { WidgetCard } from "./WidgetCard";

const meta: Meta<typeof WidgetCard> = {
  title: "3. Financial Patterns & Sections/WidgetCard",
  component: WidgetCard,
  parameters: { layout: "padded" },
  args: {
    id: "savings",
    title: "Savings",
    icon: PiggyBank,
    domain: "savings",
    label: "Savings and investments",
    figure: "£12,000",
    line: "Across your savings and investment accounts.",
    link: { to: "/app/savings", label: "Open savings" },
  },
};

export default meta;
type Story = StoryObj<typeof WidgetCard>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const WithFigure: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("£12,000")[0]).toBeDefined();
    await expect(canvas.getAllByRole("link", { name: /Open savings/ })[0]).toBeDefined();
  },
};

export const NotSet: Story = {
  args: { figure: null, line: "Add a savings account to see your balance here." },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Not set")[0]).toBeDefined();
  },
};

export const LockedInSandbox: Story = {
  decorators: [
    (Story) => (
      <SampleModeProvider value>
        <Story />
      </SampleModeProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryAllByRole("link")).toHaveLength(0);
    await expect(canvas.getAllByRole("img", { name: "Locked in this example" })[0]).toBeDefined();
  },
};
