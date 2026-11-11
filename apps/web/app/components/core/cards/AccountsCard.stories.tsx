import type { Meta, StoryObj } from "@storybook/react";
import { AccountTypeEnum } from "~/containers/accounts/utils";
import AccountsCard from "./AccountsCard";

const meta: Meta<typeof AccountsCard> = {
  title: "Core/Cards/AccountsCard",
  component: AccountsCard,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AccountsCard>;

const mockAccountDetails = [
  { id: 1, account_id: "acc-1", month: 1, year: 2026, value: 1000 },
  { id: 2, account_id: "acc-1", month: 2, year: 2026, value: 1100 },
  { id: 3, account_id: "acc-1", month: 3, year: 2026, value: 1200 },
  { id: 4, account_id: "acc-1", month: 4, year: 2026, value: 1150 },
  { id: 5, account_id: "acc-1", month: 5, year: 2026, value: 1300 },
  { id: 6, account_id: "acc-1", month: 6, year: 2026, value: 1450 },
  { id: 7, account_id: "acc-1", month: 7, year: 2026, value: 1600 },
  { id: 8, account_id: "acc-1", month: 8, year: 2026, value: 1700 },
  { id: 9, account_id: "acc-1", month: 9, year: 2026, value: 1650 },
  { id: 10, account_id: "acc-1", month: 10, year: 2026, value: 1800 },
  { id: 11, account_id: "acc-1", month: 11, year: 2026, value: 1950 },
  { id: 12, account_id: "acc-1", month: 12, year: 2026, value: 2100 },
];

export const CurrentAccount: Story = {
  args: {
    accountId: "acc-1",
    name: "Main checking account",
    type: AccountTypeEnum.CURRENT,
  },
  parameters: {
    router: {
      loaderData: {
        accountDetails: mockAccountDetails,
        accounts: [{ id: "acc-1", name: "Main checking account", type: AccountTypeEnum.CURRENT }],
      },
    },
  },
};

export const SavingsAccount: Story = {
  args: {
    accountId: "acc-1",
    name: "Super Savings",
    type: AccountTypeEnum.SAVING,
  },
  parameters: {
    router: {
      loaderData: {
        accountDetails: mockAccountDetails.map((d) => ({ ...d, value: d.value * 5 })),
        accounts: [{ id: "acc-1", name: "Super Savings", type: AccountTypeEnum.SAVING }],
      },
    },
  },
};
