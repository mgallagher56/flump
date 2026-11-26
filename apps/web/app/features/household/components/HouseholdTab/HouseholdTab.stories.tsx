import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { HouseholdTab } from "./HouseholdTab";

const meta: Meta<typeof HouseholdTab> = {
  title: "3. Patterns/Household/HouseholdTab",
  component: HouseholdTab,
  parameters: { layout: "padded" },
  args: {
    data: {
      state: {
        household: {
          sharesJointSummary: true,
          withName: "Sam",
        },
        invitation: null,
      },
      jointSummary: [
        { name: "Bills account", type: "Current", wholeBalance: 1234.5, addedBy: "you" },
        { name: "Holiday pot", type: "Saving", wholeBalance: 860, addedBy: "other" },
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdTab>;

export const InAHousehold: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("You share a household with Sam.")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Leave household" })).toBeInTheDocument();
  },
};

export const InAHouseholdDark: Story = { globals: { theme: "dark" } };

export const NotInAHousehold: Story = {
  args: { data: { state: { household: null, invitation: null }, jointSummary: null } },
};

export const NotInAHouseholdDark: Story = {
  ...NotInAHousehold,
  globals: { theme: "dark" },
};
