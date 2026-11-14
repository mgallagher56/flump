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

    // Since FLPSelect is structured as a combobox or select, we just click the Confirm button
    // which triggers submitAction.
    const addAccountBtn = getAllByText("addAccount")[2];
    expect(addAccountBtn).toBeDefined();
    await user.click(addAccountBtn);

    expect(mocks.mockFetcherSubmit).toHaveBeenCalled();
    const htmlString = baseElement.outerHTML.toString();
    const baseElementConstant = htmlString.replaceAll(/style="[^"]*"/g, "");
    expect(baseElementConstant).toMatchSnapshot();
  });

  test("should render popular banks including Trading 212 with live open banking enabled", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, bankConnectionsEnabled: true });
    const { getByText, getByLabelText, queryByText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="123456" />,
    );
    await user.click(getByText("addAccount"));

    // Switch to Connect a bank
    await user.click(getByText("Connect a bank"));

    // Verify popular banks and Trading 212 are listed
    expect(getByText("Monzo Bank")).toBeDefined();
    expect(getByText("Starling Bank")).toBeDefined();
    expect(getByText("Trading 212")).toBeDefined();
    expect(getByText("HSBC Bank")).toBeDefined();
    expect(getByText("Barclays")).toBeDefined();
    expect(getByText("Revolut")).toBeDefined();

    // No "Live" badge on any tile: bank connection is a preview (ruling 4)
    expect(queryByText("Live")).toBeNull();

    // Select Trading 212
    await user.click(getByText("Trading 212"));

    // Verify Trading 212 API Key prompt
    expect(getByText("Trading 212 API key")).toBeDefined();

    // Enter API key (no placeholder: the hint says where the key comes from)
    const tokenInput = getByLabelText("Trading 212 API key");
    await user.type(tokenInput, "t212-api-key-test");

    // Click Connect
    await user.click(getByText("Connect Trading 212"));

    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      {
        intent: "connectBank",
        institutionId: "trading212",
        token: "t212-api-key-test",
        authType: "token",
      },
      { method: "POST", action: "/app/accounts" },
    );
  });

  test("should submit real bank connection credentials for direct sync bank", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, bankConnectionsEnabled: true });
    const { getByText, getByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="123456" />,
    );
    await user.click(getByText("addAccount"));
    await user.click(getByText("Connect a bank"));

    // Select Monzo
    await user.click(getByText("Monzo Bank"));

    // Enter token
    const tokenInput = getByLabelText("Monzo access token");
    await user.type(tokenInput, "secret-monzo-token");

    // Click Connect Monzo Bank
    await user.click(getByText("Connect Monzo Bank"));

    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      {
        intent: "connectBank",
        institutionId: "monzo",
        token: "secret-monzo-token",
        authType: "token",
      },
      { method: "POST", action: "/app/accounts" },
    );
  });

  test("should submit OAuth portal request when clicking Authorize button", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, bankConnectionsEnabled: true });
    const { getByText, user } = customRender(<AddEditAccountsDialogBtn accountId="123456" />);
    await user.click(getByText("addAccount"));
    await user.click(getByText("Connect a bank"));

    // Select Bank sign-in
    await user.click(getByText("Bank sign-in"));

    // Click Sign in at Monzo Bank
    await user.click(getByText("Sign in at Monzo Bank"));

    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      {
        intent: "connectBank",
        institutionId: "monzo",
        authType: "oauth",
      },
      { method: "POST", action: "/app/accounts" },
    );
  });

  test("hides the bank connection option when bank connection is not enabled for the account", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, bankConnectionsEnabled: false });
    const { queryByText, getByText, user } = customRender(<AddEditAccountsDialogBtn />);
    await user.click(getByText("addAccount"));
    expect(queryByText("Connect a bank")).toBeNull();
  });
});
