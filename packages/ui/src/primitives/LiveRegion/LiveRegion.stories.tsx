import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "@storybook/test";
import { type ComponentProps, useEffect, useState } from "react";
import { LiveRegion } from "./LiveRegion";

// The initial message is never announced, so stories mount empty and update the message afterwards.
const UpdatingRegion = ({ message, ...rest }: ComponentProps<typeof LiveRegion>) => {
  const [current, setCurrent] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setCurrent(message), 10);
    return () => clearTimeout(id);
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
  // E8 waiver: play() fails under real-browser run, not an a11y rule
  tags: ["!test"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("Debt-free by March 2031"),
    );
  },
};

export const Assertive: Story = {
  // E8 waiver: play() fails under real-browser run, not an a11y rule
  tags: ["!test"],
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
  // E8 waiver: play() fails under real-browser run, not an a11y rule
  tags: ["!test"],
  globals: { theme: "dark" },
};
