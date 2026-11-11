import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "@storybook/test";
import { LiveRegion } from "./LiveRegion";

const meta: Meta<typeof LiveRegion> = {
  title: "2. Primitives/LiveRegion",
  component: LiveRegion,
  parameters: { layout: "centered" },
  args: { message: "Debt-free by March 2031", debounceMs: 50 },
};

export default meta;
type Story = StoryObj<typeof LiveRegion>;

export const Polite: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("Debt-free by March 2031"),
    );
  },
};

export const Assertive: Story = {
  args: { politeness: "assertive", message: "Could not save" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("alert")).toHaveTextContent("Could not save"));
  },
};

export const Hidden: Story = {
  args: { visuallyHidden: true },
};

export const Dark: Story = {
  ...Polite,
  globals: { theme: "dark" },
};
