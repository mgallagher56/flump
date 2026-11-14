import type { Meta, StoryObj } from "@storybook/react";
import { type ReactNode, useEffect } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { AccountTypeEnum } from "~/containers/accounts/utils";
import AddEditAccountsDialogBtn from "./AddEditAccountsDialog";

/** Portalled dialogs escape the preview's themed wrapper, so theme the document root too. */
const DarkRoot = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    return () => {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
    };
  }, []);
  return children;
};

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
    const typeSelect = await screen.findByLabelText("Account type");
    expect(screen.queryByLabelText("Repayment plan")).toBeNull();
    await userEvent.selectOptions(typeSelect, AccountTypeEnum.STUDENT_LOAN);
    await waitFor(() => expect(screen.getByLabelText("Repayment plan")).toBeInTheDocument());
  },
};

const bankLoaderData = { ...mockLoaderData, bankConnectionsEnabled: true };

const openAdd = async () => {
  await userEvent.click(await screen.findByRole("button", { name: /addAccount|add account/i }));
  await screen.findByRole("dialog");
};

export const OpenAddDialog: Story = {
  args: { isEditAccount: false },
  parameters: { router: { loaderData: mockLoaderData } },
  play: async () => {
    await openAdd();
    await expect(screen.getByLabelText("Name")).toBeInTheDocument();
    await expect(screen.getByLabelText("Account type")).toBeInTheDocument();
  },
};

export const OpenEditDialog: Story = {
  args: { accountId: "acc-2", isEditAccount: true },
  parameters: { router: { loaderData: mockLoaderData } },
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /edit/i }));
    await screen.findByRole("dialog");
    await expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  },
};

export const ConnectBankTab: Story = {
  args: { isEditAccount: false },
  parameters: { router: { loaderData: bankLoaderData } },
  play: async () => {
    await openAdd();
    await userEvent.click(screen.getByRole("tab", { name: /connect a bank/i }));
    await expect(screen.getAllByRole("button", { name: /Monzo Bank/ }).length).toBeGreaterThan(0);
  },
};

export const OpenAddDialogDark: Story = {
  args: { isEditAccount: false },
  parameters: { router: { loaderData: bankLoaderData } },
  decorators: [
    (Story) => (
      <DarkRoot>
        <Story />
      </DarkRoot>
    ),
  ],
  play: async () => {
    await openAdd();
    await userEvent.click(screen.getByRole("tab", { name: /connect a bank/i }));
    await expect(screen.getByRole("button", { name: /Starling Bank/ })).toBeInTheDocument();
  },
};
