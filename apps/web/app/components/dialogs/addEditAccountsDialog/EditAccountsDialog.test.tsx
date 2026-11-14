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

  test("delete opens a confirm dialog and submits nothing until confirmed", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "123456", name: "Monzo Current", type: "Current", balance: 10 }],
    });
    mocks.mockFetcherSubmit.mockClear();
    const confirmSpy = vi.fn();
    window.confirm = confirmSpy;
    const { getByText, getByRole, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );

    await user.click(getByText("edit"));
    await user.click(getByText("delete"));

    const dialog = getByRole("alertdialog", { name: "Delete Monzo Current?" });
    expect(dialog.textContent).toContain(
      "Its balance history will be deleted too. This cannot be undone.",
    );
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();

    await user.click(getByRole("button", { name: "Delete account" }));
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledTimes(1);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      { intent: "delete", accountId: "123456" },
      expect.anything(),
    );
  });

  test("cancel leaves the edit modal open and submits nothing", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "123456", name: "Monzo Current", type: "Current", balance: 10 }],
    });
    mocks.mockFetcherSubmit.mockClear();
    const { getByText, getByRole, queryByRole, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );

    await user.click(getByText("edit"));
    await user.click(getByText("delete"));
    await user.click(getByRole("button", { name: "Cancel" }));

    expect(queryByRole("alertdialog")).toBeNull();
    expect(getByRole("dialog")).toBeDefined();
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
  });

  test("Escape closes only the confirm dialog, returns focus and keeps the edit modal", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "123456", name: "Monzo Current", type: "Current", balance: 10 }],
    });
    mocks.mockFetcherSubmit.mockClear();
    const { getByText, getByRole, queryByRole, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );

    await user.click(getByText("edit"));
    const deleteBtn = getByText("delete");
    await user.click(deleteBtn);
    expect(getByRole("alertdialog")).toBeDefined();

    await user.keyboard("{Escape}");

    expect(queryByRole("alertdialog")).toBeNull();
    expect(getByRole("dialog")).toBeDefined();
    await waitFor(() => expect(document.activeElement).toBe(deleteBtn.closest("button")));
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();

    // The outer modal is still open, so it legitimately keeps the scroll lock. Closing it
    // must release everything the nested dialog stacked up.
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

    test("open edit and save without changes sends the same stored balance", async () => {
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
        balance: "-38500",
      });
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
      expect((getByLabelText("Balance") as HTMLInputElement).value).toContain("120");
      await user.click(getByText("save"));
      expect(lastSubmit()).toMatchObject({ balance: "-120" });
    });
  });

  test("delete is a quiet ghost action and the confirmation names only what exists", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "123456", name: "Monzo Current", type: "Current", balance: 10 }],
    });
    const { getByText, getByRole, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />,
    );
    await user.click(getByText("edit"));
    const deleteBtn = getByText("delete").closest("button") as HTMLButtonElement;
    expect(deleteBtn.dataset.variant).toBe("ghost");
    expect(getByText("save").closest("button")?.dataset.variant).toBe("primary");
    expect(getByRole("button", { name: "Cancel" }).dataset.variant).toBe("ghost");

    await user.click(deleteBtn);
    const text = getByRole("alertdialog").textContent ?? "";
    expect(text).not.toMatch(/transactions/i);
    expect(text).not.toMatch(/bank connections/i);
  });
});
