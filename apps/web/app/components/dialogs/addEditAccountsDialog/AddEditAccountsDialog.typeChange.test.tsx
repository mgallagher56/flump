import type { ReactNode } from "react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AddEditAccountsDialogBtn from "./AddEditAccountsDialog";

const mocks = vi.hoisted(() => ({ mockUseLoaderData: vi.fn() }));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({ submit: vi.fn(), state: "idle", data: null, Form: "form" }),
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
  };
});

const SENTENCE =
  "This turns the debt into something you own, so net worth this month and in every past month rises by twice its balance.";

const openEdit = async (type: string, balance: number) => {
  mocks.mockUseLoaderData.mockReturnValue({
    accounts: [{ id: "a1", name: "My account", type, balance }],
  });
  const utils = customRender(<AddEditAccountsDialogBtn isEditAccount accountId="a1" />);
  await utils.user.click(utils.getByText("edit"));
  return utils;
};

describe("AddEditAccountsDialog type change (CH-4)", () => {
  test("says net worth rises when an overdraft becomes a saving", async () => {
    const { getByLabelText, queryByText, user } = await openEdit("Overdraft", -500);
    expect(queryByText(SENTENCE)).toBeNull();
    await user.selectOptions(getByLabelText("Account type"), "Saving");
    expect(queryByText(SENTENCE)).not.toBeNull();
  });

  test("says nothing when a debt becomes a current account (it stays overdrawn)", async () => {
    const { getByLabelText, queryByText, user } = await openEdit("Credit Card", -400);
    await user.selectOptions(getByLabelText("Account type"), "Current");
    expect(queryByText(SENTENCE)).toBeNull();
  });

  test("says nothing when something you own becomes a debt", async () => {
    const { getByLabelText, queryByText, user } = await openEdit("Saving", 800);
    await user.selectOptions(getByLabelText("Account type"), "Loan");
    expect(queryByText(SENTENCE)).toBeNull();
  });
});
