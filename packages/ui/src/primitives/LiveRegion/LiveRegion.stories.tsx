import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "@storybook/test";
import { type ComponentProps, useEffect, useState } from "react";
import { LiveRegion } from "./LiveRegion";

// The first populated message is a silent baseline, so stories emit a baseline message and then
// the changed message, which is the one that gets announced.
const UpdatingRegion = ({ message, ...rest }: ComponentProps<typeof LiveRegion>) => {
  const [current, setCurrent] = useState("");
  useEffect(() => {
    const first = setTimeout(() => setCurrent("Calculating…"), 10);
    const second = setTimeout(() => setCurrent(message), 100);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, [message]);
  return <LiveRegion {...rest} message={current} />;
};

const meta: Meta<typeof LiveRegion> = {
  title: "2. Primitives/LiveRegion",
  component: LiveRegion,
  parameters: { layout: "centered" },
  args: { message: "Debt-free by March 2031", debounceMs: 50 },
  render: (args) => <UpdatingRegion {...args} />,
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole("status");
    // Still exposed to assistive tech and updated, but not visible on screen.
    await waitFor(() => expect(region).toHaveTextContent("Debt-free by March 2031"));
    await expect(region).not.toHaveAttribute("aria-hidden");
    const { width, height } = region.getBoundingClientRect();
    await expect(width <= 1 && height <= 1).toBe(true);
  },
};

export const Dark: Story = {
  ...Polite,
  globals: { theme: "dark" },
};
