import type { Meta, StoryObj } from "@storybook/react";
import AccountDetails from "./AccountDetails";

const meta: Meta<typeof AccountDetails> = {
  title: "Accounts/AccountDetails",
  component: AccountDetails,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AccountDetails>;

const mockLoaderData = {
  account: { id: "acc-1", name: "Main Savings", type: "Saving" },
  accountDetails: [
    { id: 1, account_id: "acc-1", month: 1, year: 2026, value: 5000 },
    { id: 2, account_id: "acc-1", month: 2, year: 2026, value: 5100 },
    { id: 3, account_id: "acc-1", month: 3, year: 2026, value: 5300 },
  ],
};

export const ViewMode: Story = {
  args: {
    isEditMode: false,
    editedValues: {},
    onInputChange: () => {},
  },
  parameters: {
    router: {
      loaderData: mockLoaderData,
    },
  },
};

export const EditMode: Story = {
  args: {
    isEditMode: true,
    editedValues: {
      "2026": {
        "1": "5200",
        "2": "5100",
        "3": "5400",
      },
    },
    onInputChange: (e) => console.log("Input changed:", e.target.value),
  },
  parameters: {
    router: {
      loaderData: mockLoaderData,
    },
  },
};
