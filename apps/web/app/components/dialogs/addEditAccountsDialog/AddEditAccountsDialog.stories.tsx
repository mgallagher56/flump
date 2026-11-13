import type { Meta, StoryObj } from "@storybook/react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
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

export const StudentLoanAccount: Story = {
  args: {
    isEditAccount: false,
    btnSize: "md",
  },
  parameters: {
    router: {
      loaderData: mockLoaderData,
    },
  },
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /addAccount|add account/i }));
    const typeSelect = await screen.findByLabelText("Account Type");
    expect(screen.queryByLabelText("Repayment plan")).toBeNull();
    await userEvent.selectOptions(typeSelect, AccountTypeEnum.STUDENT_LOAN);
    await waitFor(() => expect(screen.getByLabelText("Repayment plan")).toBeInTheDocument());
  },
};
