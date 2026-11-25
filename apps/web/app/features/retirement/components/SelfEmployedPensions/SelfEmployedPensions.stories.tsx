import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { SelfEmployedPensions } from "./SelfEmployedPensions";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof SelfEmployedPensions> = {
  title: "3. Patterns/Retirement/SelfEmployedPensions",
  component: SelfEmployedPensions,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SelfEmployedPensions>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getAllByRole("button", {
      name: /Pensions when you are self-employed/,
    })[0];
    if (!trigger) throw new Error("no trigger");
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(
      canvas.getAllByText(
        "In most personal pensions, the provider adds basic rate tax relief. A payment of £80 becomes £100 in the pension.",
      )[0],
    ).toBeInTheDocument();
  },
};
