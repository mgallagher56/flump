import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
  afterEach(() => vi.unstubAllGlobals());

  test("a failed delete shows the error in the confirm dialog and keeps both dialogs open", async () => {
    const ui = () => <AddEditAccountsDialogBtn isEditAccount accountId="123456" />;
    const { getByText, getByRole, queryByRole, rerender, user } = customRender(ui());
    await user.click(getByText("edit"));
    await user.click(getByText("delete"));
    await user.click(getByRole("button", { name: "Delete account" }));
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledTimes(1);
    // The edit modal has not been closed while the request is outstanding (hidden behind the alert).
    expect(getByRole("dialog", { hidden: true })).toBeDefined();
    expect(getByRole("alertdialog")).toBeDefined();

    mocks.fetcher.data = { success: false, error: SERVER_DOWN };
    rerender(ui());
    expect(getByRole("alert").textContent).toBe(SERVER_DOWN);
    expect(getByRole("alertdialog")).toBeDefined();
    expect(getByRole("dialog", { hidden: true })).toBeDefined();

    // Retry succeeds: only now does everything close.
    await user.click(getByRole("button", { name: "Delete account" }));
    mocks.fetcher.data = { success: true };
    rerender(ui());
    expect(queryByRole("alertdialog")).toBeNull();
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

  describe("OAuth redirect", () => {
    const startOauth = async () => {
      const ui = () => <AddEditAccountsDialogBtn />;
      const view = customRender(ui());
      await view.user.click(view.getByText("addAccount"));
      await view.user.click(view.getByText("Connect to bank"));
      await view.user.click(view.getByText("OAuth portal"));
      await view.user.click(view.getByRole("button", { name: /Authorise via/ }));
      return { ...view, ui };
    };

    test("navigates only to an https URL", async () => {
      const location = { href: "" };
      vi.stubGlobal("location", location);
      const { rerender, ui } = await startOauth();
      mocks.fetcher.data = {
        success: true,
        oauth: true,
        redirectUrl: "https://bank.example.test/auth",
      };
      rerender(ui());
      expect(location.href).toBe("https://bank.example.test/auth");
    });

    test.each(["javascript:alert(1)", "http://bank.example.test/auth", "not a url"])(
      "rejects %s and shows an error without navigating",
      async (redirectUrl) => {
        const location = { href: "" };
        vi.stubGlobal("location", location);
        const { getByText, rerender, ui } = await startOauth();
        mocks.fetcher.data = { success: true, oauth: true, redirectUrl };
        rerender(ui());
        expect(location.href).toBe("");
        expect(getByText("We couldn't start the bank sign-in. Please try again.")).toBeDefined();
      },
    );
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
      await user.click(getAllByText("save")[0]);
      expect(lastSubmit()).toMatchObject({ studentLoanPlan: "PLAN_5" });
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
});
