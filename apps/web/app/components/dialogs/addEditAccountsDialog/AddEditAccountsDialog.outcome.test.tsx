import { ToastProvider } from "@repo/ui";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AddEditAccountsDialogBtn from "./AddEditAccountsDialog";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockFetcherSubmit: vi.fn(),
  fetcher: { state: "idle", data: null as unknown },
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({
      submit: mocks.mockFetcherSubmit,
      state: mocks.fetcher.state,
      data: mocks.fetcher.data,
      Form: "form",
    }),
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
  };
});

const SERVER_DOWN = "We couldn't reach the server. Please try again.";
const accounts = [{ id: "123456", name: "Monzo Current", type: "Current", balance: 10 }];

describe("AddEditAccountsDialog action outcomes", () => {
  beforeEach(() => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts, bankConnectionsEnabled: true });
    mocks.mockFetcherSubmit.mockClear();
    mocks.fetcher.state = "idle";
    mocks.fetcher.data = null;
  });

  test("a failed delete shows the error in the question and keeps the dialog open", async () => {
    const ui = () => <AddEditAccountsDialogBtn isEditAccount accountId="123456" />;
    const { getByText, getByRole, queryByRole, rerender, user } = customRender(ui());
    await user.click(getByText("edit"));
    await user.click(getByText("delete"));
    const confirmName = /^Delete (?!.*\?)/;
    await user.click(getByRole("button", { name: confirmName }));
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledTimes(1);
    // The one dialog stays open on the question while the request is outstanding.
    expect(queryByRole("alertdialog")).toBeNull();
    expect(getByRole("dialog", { name: /^Delete .*\?$/ })).toBeDefined();

    mocks.fetcher.data = { success: false, error: SERVER_DOWN };
    rerender(ui());
    expect(getByRole("alert").textContent).toBe(SERVER_DOWN);
    expect(getByRole("dialog", { name: /^Delete .*\?$/ })).toBeDefined();

    // Retry succeeds: only now does it close.
    await user.click(getByRole("button", { name: confirmName }));
    mocks.fetcher.data = { success: true };
    rerender(ui());
    expect(queryByRole("dialog")).toBeNull();
  });

  test("a failed save shows the error and keeps the modal open; success closes it", async () => {
    const ui = () => <AddEditAccountsDialogBtn isEditAccount accountId="123456" />;
    const { getByText, getAllByText, getByRole, queryByRole, rerender, user } = customRender(ui());
    await user.click(getByText("edit"));
    await user.click(getAllByText("save")[0]);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledTimes(1);
    expect(getByRole("dialog")).toBeDefined();

    mocks.fetcher.data = { success: false, error: SERVER_DOWN };
    rerender(ui());
    expect(getByRole("alert").textContent).toBe(SERVER_DOWN);
    expect(getByRole("dialog")).toBeDefined();

    await user.click(getAllByText("save")[0]);
    mocks.fetcher.data = { success: true };
    rerender(ui());
    expect(queryByRole("dialog")).toBeNull();
  });

  test("a create sends one request id per opening: the same on a retry, a new one when reopened", async () => {
    const ui = () => <AddEditAccountsDialogBtn />;
    const { getByText, getAllByText, getByRole, rerender, user } = customRender(ui());
    const sentId = (call: number) =>
      (mocks.mockFetcherSubmit.mock.calls[call]?.[0] as Record<string, string> | undefined)
        ?.requestId;
    await user.click(getByText("addAccount"));
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    mocks.fetcher.data = { success: false, error: SERVER_DOWN };
    rerender(ui());
    expect(getByRole("alert").textContent).toBe(SERVER_DOWN);
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(sentId(0)).toMatch(/\S/);
    expect(sentId(1)).toBe(sentId(0));

    mocks.fetcher.data = { success: true };
    rerender(ui());
    await user.click(getByText("addAccount"));
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(sentId(2)).not.toBe(sentId(0));
  });

  test("a save that answers with a notice closes the dialog and shows the notice", async () => {
    const NOTICE =
      "We saved your mortgage but could not save your home value. Add it on the mortgage page.";
    const ui = () => (
      <ToastProvider>
        <AddEditAccountsDialogBtn />
      </ToastProvider>
    );
    const { getByText, getAllByText, queryByRole, findByText, rerender, user } = customRender(ui());
    await user.click(getByText("addAccount"));
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    mocks.fetcher.data = { success: true, notice: NOTICE };
    rerender(ui());
    expect(queryByRole("dialog")).toBeNull();
    expect(await findByText(NOTICE)).toBeDefined();
  });

  test("a failed create shows the error and keeps the modal open", async () => {
    const ui = () => <AddEditAccountsDialogBtn />;
    const { getByText, getAllByText, getByRole, rerender, user } = customRender(ui());
    await user.click(getByText("addAccount"));
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledTimes(1);

    mocks.fetcher.data = { success: false, error: SERVER_DOWN };
    rerender(ui());
    expect(getByRole("alert").textContent).toBe(SERVER_DOWN);
    expect(getByRole("dialog")).toBeDefined();
  });

  describe("student loan repayment plan", () => {
    const planAccounts = [
      { id: "sl1", name: "SLC", type: "Student Loan", balance: -40000, studentLoanPlan: "PLAN_5" },
      { id: "c1", name: "Current", type: "Current", balance: 10, studentLoanPlan: null },
    ];
    const lastSubmit = () =>
      mocks.mockFetcherSubmit.mock.calls.at(-1)?.[0] as Record<string, string>;

    beforeEach(() => {
      mocks.mockUseLoaderData.mockReturnValue({
        accounts: planAccounts,
        bankConnectionsEnabled: false,
      });
    });

    test("the plan select appears only for Student Loan", async () => {
      const { getByText, getByLabelText, queryByLabelText, user } = customRender(
        <AddEditAccountsDialogBtn />,
      );
      await user.click(getByText("addAccount"));
      expect(queryByLabelText("Repayment plan")).toBeNull();
      await user.selectOptions(getByLabelText("Account type"), "Student Loan");
      expect(getByLabelText("Repayment plan")).toBeDefined();
      await user.selectOptions(getByLabelText("Account type"), "Loan");
      expect(queryByLabelText("Repayment plan")).toBeNull();
    });

    test("blocks submit with a visible error until a plan is chosen, then submits it", async () => {
      const { getByText, getAllByText, getByLabelText, getByRole, user } = customRender(
        <AddEditAccountsDialogBtn />,
      );
      await user.click(getByText("addAccount"));
      await user.type(getByLabelText("Name"), "Plan loan");
      await user.selectOptions(getByLabelText("Account type"), "Student Loan");
      expect((getByLabelText("Repayment plan") as HTMLSelectElement).value).toBe("");
      await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
      expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
      expect(getByRole("alert").textContent).toBe("Choose a repayment plan");

      await user.selectOptions(getByLabelText("Repayment plan"), "PLAN_2");
      await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
      expect(mocks.mockFetcherSubmit).toHaveBeenCalledTimes(1);
      expect(lastSubmit()).toMatchObject({ type: "Student Loan", studentLoanPlan: "PLAN_2" });
    });

    test("prefills the plan when editing a Student Loan", async () => {
      const { getByText, getAllByText, getByLabelText, user } = customRender(
        <AddEditAccountsDialogBtn isEditAccount accountId="sl1" />,
      );
      await user.click(getByText("edit"));
      expect((getByLabelText("Repayment plan") as HTMLSelectElement).value).toBe("PLAN_5");
      await user.selectOptions(getByLabelText("Repayment plan"), "PLAN_2");
      await user.click(getAllByText("save")[0]);
      expect(lastSubmit()).toMatchObject({ studentLoanPlan: "PLAN_2" });
    });

    test("does not send an untouched plan again (an edit sends what changed)", async () => {
      const { getByText, getAllByText, user } = customRender(
        <AddEditAccountsDialogBtn isEditAccount accountId="sl1" />,
      );
      await user.click(getByText("edit"));
      await user.click(getAllByText("save")[0]);
      expect(lastSubmit()).not.toHaveProperty("studentLoanPlan");
    });

    test("does not send a plan for other account types", async () => {
      const { getByText, getAllByText, user } = customRender(
        <AddEditAccountsDialogBtn isEditAccount accountId="c1" />,
      );
      await user.click(getByText("edit"));
      await user.click(getAllByText("save")[0]);
      expect(lastSubmit()).not.toHaveProperty("studentLoanPlan");
    });
  });

  describe("joint ownership and share percentage (E34 Slice 2)", () => {
    const lastSubmit = () =>
      mocks.mockFetcherSubmit.mock.calls.at(-1)?.[0] as Record<string, string>;

    test("shows joint share input and joint-liability notice for a joint mortgage, and hides ownership for pensions and ISAs", async () => {
      const {
        getByText,
        getAllByText,
        getByLabelText,
        getByRole,
        queryByLabelText,
        queryByRole,
        user,
      } = customRender(<AddEditAccountsDialogBtn />);

      await user.click(getByText("addAccount"));
      await user.selectOptions(getByLabelText("Account type"), "Mortgage");
      expect(getByLabelText("Ownership")).toBeDefined();
      expect(queryByLabelText("Your share")).toBeNull();
      expect(queryByRole("note")).toBeNull();

      await user.selectOptions(getByLabelText("Ownership"), "joint");
      expect(getByLabelText("Your share")).toBeDefined();
      expect(getByRole("note").textContent).toContain(
        "Each borrower on a joint mortgage or loan is legally liable for the whole debt.",
      );

      // Switching to Pension hides ownership and submits sole
      await user.selectOptions(getByLabelText("Account type"), "Pension");
      expect(queryByLabelText("Ownership")).toBeNull();
      expect(queryByRole("note")).toBeNull();

      // Switching to Saving with "Cash ISA" in name hides ownership
      await user.selectOptions(getByLabelText("Account type"), "Saving");
      expect(getByLabelText("Ownership")).toBeDefined();
      await user.type(getByLabelText("Name"), "Cash ISA");
      expect(queryByLabelText("Ownership")).toBeNull();

      await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
      expect(lastSubmit()).toMatchObject({ ownership: "sole" });
      expect(lastSubmit()).not.toHaveProperty("sharePercent");
    });

    test("submits joint ownership and custom sharePercent for a joint mortgage", async () => {
      const { getByText, getAllByText, getByLabelText, user } = customRender(
        <AddEditAccountsDialogBtn />,
      );
      await user.click(getByText("addAccount"));
      await user.type(getByLabelText("Name"), "Home mortgage");
      await user.selectOptions(getByLabelText("Account type"), "Mortgage");
      await user.selectOptions(getByLabelText("Ownership"), "joint");
      const shareInput = getByLabelText("Your share") as HTMLInputElement;
      await user.clear(shareInput);
      await user.type(shareInput, "60");
      await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
      expect(lastSubmit()).toMatchObject({
        name: "Home mortgage",
        type: "Mortgage",
        ownership: "joint",
        sharePercent: "60",
      });
    });
  });
});
