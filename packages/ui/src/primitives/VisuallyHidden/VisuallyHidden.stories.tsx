import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { VisuallyHidden } from "./VisuallyHidden";

const meta: Meta<typeof VisuallyHidden> = {
  title: "2. Primitives/VisuallyHidden",
  component: VisuallyHidden,
  parameters: { layout: "centered" },
  args: { children: "Screen reader only text" },
};

export default meta;
type Story = StoryObj<typeof VisuallyHidden>;

export const Default: Story = {
  render: (args) => (
    <button type="button">
      <span aria-hidden="true">£</span>
      <VisuallyHidden {...args} />
    </button>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /Screen reader only text/ }),
    ).toBeInTheDocument();
  },
};

export const Focusable: Story = {
  args: { focusable: true, children: "Skip to content" },
  render: (args) => <VisuallyHidden {...args} tabIndex={0} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const el = canvas.getByText("Skip to content");
    await expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    await userEvent.tab();
    await expect(el).toHaveFocus();
    await expect(el.getBoundingClientRect().width).toBeGreaterThan(1);
  },
};

export const Dark: Story = {
  ...Focusable,
  globals: { theme: "dark" },
};
