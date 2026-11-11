import { cleanup, waitFor } from "@testing-library/react";
import mockUser from "__mocks__/user";
import type { ReactNode } from "react";
import { vi } from "vitest";
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
    expect(dialog.textContent).toContain("This deletes the account and its full balance history.");
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
});
