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
      await view.user.click(view.getByText("Connect to Bank"));
      await view.user.click(view.getByText("OAuth Portal"));
      await view.user.click(view.getByRole("button", { name: /Authorize via/ }));
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
});
