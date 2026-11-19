import { cleanup, waitFor } from "@testing-library/react";
import mockUser from "__mocks__/user";
import type { ReactNode } from "react";
import { beforeEach, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AddEditAccountsDialogBtn from "./AddEditAccountsDialog";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
  mockFetcherSubmit: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: mocks.mockUseRevalidator,
    useFetcher: () => ({
      submit: mocks.mockFetcherSubmit,
      state: "idle",
      data: null,
      Form: "form",
    }),
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    useSubmit: () => ({ onSubmit: vi.fn() }),
  };
});

describe("<EditAccountDialogBtn", () => {
  beforeAll(() => {
    cleanup();
  });
  test("should render edit account dialog when trigger button is clicked", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement, getByText, getAllByText, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );

    const triggerBtn = getByText("edit");
    expect(triggerBtn).toBeDefined();
    await user.click(triggerBtn);

    const saveBtn = getAllByText("save")[0];
    await user.click(saveBtn);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "update",
        accountId: "123456",
      }),
      expect.anything(),
    );

    const htmlString = baseElement.outerHTML.toString();
    const baseElementConstant = htmlString.replaceAll(/style="[^"]*"/g, "");
    expect(baseElementConstant).toMatchSnapshot();
  });

  test("delete swaps the edit dialog's content for the question; nothing stacks or submits until confirmed", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "123456", name: "Monzo Current", type: "Current", balance: 10 }],
    });
    mocks.mockFetcherSubmit.mockClear();
    const confirmSpy = vi.fn();
    window.confirm = confirmSpy;
    const { getByText, getByRole, getAllByRole, queryByRole, queryByLabelText, user } =
      customRender(<AddEditAccountsDialogBtn isEditAccount accountId="123456" />);

    await user.click(getByText("edit"));
    await user.click(getByText("delete"));

    // One modal only: the edit dialog now asks the question in place of the form.
    expect(queryByRole("alertdialog")).toBeNull();
    expect(getAllByRole("dialog")).toHaveLength(1);
    const dialog = getByRole("dialog", { name: "Delete Monzo Current?" });
    expect(dialog.textContent).toContain(
      "Its balance history will be deleted too. This cannot be undone.",
    );
    expect(queryByLabelText("Name")).toBeNull();
    // Cancel first, then the destructive button naming the account; focus starts on Cancel.
    const cancel = getByRole("button", { name: "Cancel" });
    const confirm = getByRole("button", { name: "Delete Monzo Current" });
    expect(cancel.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(confirm.dataset.variant).toBe("destructive");
    await waitFor(() => expect(document.activeElement).toBe(cancel));
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();

    await user.click(confirm);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledTimes(1);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      { intent: "delete", accountId: "123456" },
      expect.anything(),
    );
  });

  test("cancel goes back to the form, returns focus to Delete and submits nothing", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "123456", name: "Monzo Current", type: "Current", balance: 10 }],
    });
    mocks.mockFetcherSubmit.mockClear();
    const { getByText, getByRole, getByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );

    await user.click(getByText("edit"));
    await user.click(getByText("delete"));
    await user.click(getByRole("button", { name: "Cancel" }));

    expect(getByRole("dialog", { name: "editAccount" })).toBeDefined();
    expect((getByLabelText("Name") as HTMLInputElement).value).toBe("Monzo Current");
    await waitFor(() => expect(document.activeElement).toBe(getByText("delete").closest("button")));
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
  });

  test("Escape on the question goes back to the form; Escape again closes and releases the page", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "123456", name: "Monzo Current", type: "Current", balance: 10 }],
    });
    mocks.mockFetcherSubmit.mockClear();
    const { getByText, getByRole, queryByRole, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );

    await user.click(getByText("edit"));
    await user.click(getByText("delete"));
    expect(getByRole("dialog", { name: "Delete Monzo Current?" })).toBeDefined();

    await user.keyboard("{Escape}");
    expect(getByRole("dialog", { name: "editAccount" })).toBeDefined();
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(queryByRole("dialog")).toBeNull());
    expect(document.body.style.pointerEvents).not.toBe("none");
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
  });

  test("opened from the account page, prefills from the account passed in", async () => {
    // The account detail route returns one account and no accounts list.
    mocks.mockUseLoaderData.mockReturnValue({
      account: { id: "123456", name: "Easy saver", type: "Saving", balance: 2500 },
      accountDetails: [],
    });
    mocks.mockFetcherSubmit.mockClear();
    const { getByText, getByDisplayValue, user } = customRender(
      <AddEditAccountsDialogBtn
        account={{ id: "123456", name: "Easy saver", type: "Saving", balance: 2500 }}
        accountId="123456"
        isEditAccount
      />,
    );

    await user.click(getByText("edit"));
    expect(getByDisplayValue("Easy saver")).toBeDefined();
    await user.click(getByText("save"));
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "update",
        accountId: "123456",
        name: "Easy saver",
        type: "Saving",
      }),
      expect.anything(),
    );
  });

  describe("a liability shows the amount owed and saves the stored figure unchanged", () => {
    const studentLoan = {
      id: "sl1",
      name: "Student loan",
      type: "Student Loan",
      balance: -38500,
      studentLoanPlan: "PLAN_2",
    };
    const lastSubmit = () =>
      mocks.mockFetcherSubmit.mock.calls.at(-1)?.[0] as Record<string, string>;

    beforeEach(() => {
      mocks.mockUseLoaderData.mockReturnValue({ accounts: [studentLoan] });
      mocks.mockFetcherSubmit.mockClear();
    });

    test("open edit and save without changes sends no balance (CH-3)", async () => {
      const { getByText, getByLabelText, queryByLabelText, user } = customRender(
        <AddEditAccountsDialogBtn isEditAccount accountId="sl1" />,
      );
      await user.click(getByText("edit"));

      const owed = getByLabelText("Amount owed") as HTMLInputElement;
      expect(owed.value).toBe("38,500");
      expect(owed.value).not.toContain("-");
      expect(queryByLabelText("Balance")).toBeNull();

      await user.click(getByText("save"));
      expect(lastSubmit()).toMatchObject({
        intent: "update",
        accountId: "sl1",
        type: "Student Loan",
      });
      // An untouched balance is not re-posted, so no history row is written for this month.
      expect(lastSubmit()).not.toHaveProperty("balance");
    });

    test("a rename only sends the new name and no balance (CH-3)", async () => {
      const { getByText, getByLabelText, user } = customRender(
        <AddEditAccountsDialogBtn isEditAccount accountId="sl1" />,
      );
      await user.click(getByText("edit"));
      const name = getByLabelText("Name");
      await user.clear(name);
      await user.type(name, "SLC loan");
      await user.click(getByText("save"));
      expect(lastSubmit()).toMatchObject({ intent: "update", name: "SLC loan" });
      expect(lastSubmit()).not.toHaveProperty("balance");
    });

    test("a new amount owed is sent as minus that amount", async () => {
      const { getByText, getByLabelText, user } = customRender(
        <AddEditAccountsDialogBtn isEditAccount accountId="sl1" />,
      );
      await user.click(getByText("edit"));
      const owed = getByLabelText("Amount owed");
      await user.clear(owed);
      await user.type(owed, "37000");
      await user.tab();
      await user.click(getByText("save"));
      expect(lastSubmit()).toMatchObject({ balance: "-37000" });
    });

    test("an asset keeps its sign and its Balance label", async () => {
      mocks.mockUseLoaderData.mockReturnValue({
        accounts: [{ id: "c1", name: "Current", type: "Current", balance: -120 }],
      });
      const { getByText, getByLabelText, user } = customRender(
        <AddEditAccountsDialogBtn isEditAccount accountId="c1" />,
      );
      await user.click(getByText("edit"));
      const balance = getByLabelText("Balance") as HTMLInputElement;
      expect(balance.value).toContain("120");
      await user.clear(balance);
      await user.type(balance, "-150");
      await user.tab();
      await user.click(getByText("save"));
      expect(lastSubmit()).toMatchObject({ balance: "-150" });
    });
  });

  test("delete is the subtle danger button and the confirmation names only what exists", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "123456", name: "Monzo Current", type: "Current", balance: 10 }],
    });
    const { getByText, getByRole, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );
    await user.click(getByText("edit"));
    const deleteBtn = getByText("delete").closest("button") as HTMLButtonElement;
    expect(deleteBtn.dataset.variant).toBe("dangerSubtle");
    expect(getByText("save").closest("button")?.dataset.variant).toBe("primary");
    expect(getByRole("button", { name: "Cancel" }).dataset.variant).toBe("ghost");

    await user.click(deleteBtn);
    const text = getByRole("dialog").textContent ?? "";
    expect(text).not.toMatch(/transactions/i);
    expect(text).not.toMatch(/bank connections/i);
  });

  test("renaming a joint account to an ISA says it will be saved as sole (E34)", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        {
          id: "j1",
          name: "Joint saver",
          type: "Saving",
          balance: 10,
          ownership: "joint",
          sharePercent: 60,
        },
      ],
    });
    mocks.mockFetcherSubmit.mockClear();
    const { getByText, getByLabelText, queryByText, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="j1" />,
    );
    await user.click(getByText("edit"));
    expect(queryByText(/held in one name/)).toBeNull();
    const name = getByLabelText("Name") as HTMLInputElement;
    await user.clear(name);
    await user.type(name, "Cash ISA");
    expect(
      getByText("An ISA or pension is held in one name, so this account will be saved as sole."),
    ).toBeDefined();
    await user.click(getByText("save"));
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Cash ISA", ownership: "sole" }),
      expect.anything(),
    );
  });

  test("a joint account named after a person called Lisa stays joint (E34)", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        {
          id: "j2",
          name: "Lisa joint saver",
          type: "Saving",
          balance: 10,
          ownership: "joint",
          sharePercent: 60,
        },
      ],
    });
    mocks.mockFetcherSubmit.mockClear();
    const { getByText, queryByText, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="j2" />,
    );
    await user.click(getByText("edit"));
    expect(queryByText(/held in one name/)).toBeNull();
    await user.click(getByText("save"));
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ ownership: "joint", sharePercent: "60" }),
      expect.anything(),
    );
  });
});
