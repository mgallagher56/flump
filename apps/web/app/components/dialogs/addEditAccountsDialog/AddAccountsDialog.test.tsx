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

describe("<AddAccountDialogBtn", () => {
  test("should render add account dialog when trigger button is clicked", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, bankConnectionsEnabled: true });
    const { baseElement, getByText, getAllByText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="123456" />,
    );
    const triggerBtn = getByText("addAccount");
    expect(triggerBtn).toBeDefined();
    await user.click(triggerBtn);

    const nameInput = getByText("Name");
    expect(nameInput).toBeDefined();
    const accountTypeInput = getByText("Account type");
    expect(accountTypeInput).toBeDefined();

    await user.type(nameInput, "Starling");

    // The account type keeps its default, so we just click the Confirm button
    // which triggers submitAction.
    const addAccountBtn = getAllByText("addAccount")[2];
    expect(addAccountBtn).toBeDefined();
    await user.click(addAccountBtn);

    expect(mocks.mockFetcherSubmit).toHaveBeenCalled();
    const htmlString = baseElement.outerHTML.toString();
    const baseElementConstant = htmlString.replaceAll(/style="[^"]*"/g, "");
    expect(baseElementConstant).toMatchSnapshot();
  });

  test.each([true, false])(
    "is a single manual form with no bank tab when bank connection is %s (deferred)",
    async (bankConnectionsEnabled) => {
      mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, bankConnectionsEnabled });
      const { queryByText, queryByRole, getByText, getByLabelText, user } = customRender(
        <AddEditAccountsDialogBtn />,
      );
      await user.click(getByText("addAccount"));
      expect(queryByRole("tablist")).toBeNull();
      expect(queryByText("Connect a bank")).toBeNull();
      expect(queryByText(/access token/i)).toBeNull();
      expect(getByLabelText("Name")).toBeDefined();
      expect(getByLabelText("Balance")).toBeDefined();
    },
  );
});
