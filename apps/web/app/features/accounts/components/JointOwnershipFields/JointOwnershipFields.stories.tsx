import type { AccountOwnership } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { JointOwnershipFields } from "./JointOwnershipFields";

const Interactive = ({ initial }: { initial: AccountOwnership }) => {
  const [ownership, setOwnership] = useState<AccountOwnership>(initial);
  const [share, setShare] = useState<number | null>(50);
  return (
    <JointOwnershipFields
      ownership={ownership}
      sharePercent={share}
      onOwnershipChange={setOwnership}
      onSharePercentChange={setShare}
    />
  );
};

const meta: Meta<typeof Interactive> = {
  title: "3. Patterns/Accounts/JointOwnershipFields",
  component: Interactive,
  parameters: { layout: "padded" },
  args: { initial: "sole" },
};

export default meta;
type Story = StoryObj<typeof Interactive>;

export const Sole: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText("Your share")).toBeNull();
    await userEvent.selectOptions(canvas.getByLabelText("Ownership"), "joint");
    await expect(canvas.getByLabelText("Your share")).toBeDefined();
  },
};

export const Joint: Story = {
  args: { initial: "joint" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Your share")).toBeDefined();
  },
};
