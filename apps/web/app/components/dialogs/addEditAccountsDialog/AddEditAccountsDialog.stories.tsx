import type { Meta, StoryObj } from "@storybook/react";
import { AccountTypeEnum } from "~/containers/accounts/utils";
import AddEditAccountsDialogBtn from "./AddEditAccountsDialog";

const meta: Meta<typeof AddEditAccountsDialogBtn> = {
  title: "Dialogs/AddEditAccountsDialog",
  component: AddEditAccountsDialogBtn,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AddEditAccountsDialogBtn>;

const mockLoaderData = {
  accounts: [
    { id: "acc-1", name: "Main checking account", type: AccountTypeEnum.CURRENT },
    { id: "acc-2", name: "Super Savings", type: AccountTypeEnum.SAVING },
  ],
};

export const AddAccount: Story = {
  args: {
    isEditAccount: false,
    btnSize: "md",
  },
  parameters: {
    router: {
      loaderData: mockLoaderData,
    },
  },
};

export const EditAccount: Story = {
  args: {
    accountId: "acc-2",
    isEditAccount: true,
    btnSize: "md",
  },
  parameters: {
    router: {
      loaderData: mockLoaderData,
    },
  },
};
