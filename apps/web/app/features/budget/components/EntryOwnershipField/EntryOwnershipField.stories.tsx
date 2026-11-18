import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  type EntryOwnership,
  EntryOwnershipField,
  type EntryOwnershipFieldProps,
} from "./EntryOwnershipField";

/** Holds ownership and share in story state so a change shows on the page. */
const Stateful = (args: EntryOwnershipFieldProps) => {
  const [ownership, setOwnership] = useState<EntryOwnership>(args.ownership);
  const [sharePercent, setSharePercent] = useState<number | null>(args.sharePercent);
  return (
    <EntryOwnershipField
      {...args}
      ownership={ownership}
      sharePercent={sharePercent}
      onChange={(nextOwnership, nextShare) => {
        args.onChange(nextOwnership, nextShare);
        setOwnership(nextOwnership);
        setSharePercent(nextShare);
      }}
    />
  );
};

const meta: Meta<typeof EntryOwnershipField> = {
  title: "3. Patterns/Budget/EntryOwnershipField",
  component: EntryOwnershipField,
  render: (args) => <Stateful {...args} />,
  args: {
    idPrefix: "story",
    entryName: "Rent",
    ownership: "sole",
    sharePercent: null,
    onChange: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof EntryOwnershipField>;

export const Sole: Story = {};

export const Joint: Story = {
  args: { ownership: "joint", sharePercent: 40 },
};

export const MarkJoint: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText("Ownership of Rent"), "joint");
    await expect(args.onChange).toHaveBeenCalledWith("joint", 50);
    await expect(canvas.getByText("Joint, 50%")).toBeInTheDocument();
  },
};
