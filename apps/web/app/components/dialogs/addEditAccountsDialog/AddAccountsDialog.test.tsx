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
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement, getByText, getAllByText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="123456" />,
    );
    const triggerBtn = getByText("addAccount");
    expect(triggerBtn).toBeDefined();
    await user.click(triggerBtn);

    const nameInput = getByText("Name");
    expect(nameInput).toBeDefined();
    const accountTypeInput = getByText("Account Type");
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

  test("should render popular banks and allow switching to manual entry for banks without direct sync", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { getByText, getAllByText, getByPlaceholderText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="123456" />,
    );
    await user.click(getByText("addAccount"));

    // Switch to Connect to Bank
    await user.click(getByText("Connect to Bank"));

    // Verify popular banks are listed
    expect(getByText("Monzo Bank")).toBeDefined();
    expect(getByText("Starling Bank")).toBeDefined();
    expect(getByText("HSBC Bank")).toBeDefined();
    expect(getByText("Barclays")).toBeDefined();
    expect(getByText("Revolut")).toBeDefined();

    // Select HSBC (coming soon)
    await user.click(getByText("HSBC Bank"));
    expect(getByText("Direct Sync for HSBC Bank coming soon")).toBeDefined();

    // Click track via manual entry
    const trackManualBtns = getAllByText("Track HSBC Bank via Manual Entry");
    expect(trackManualBtns.length).toBeGreaterThan(0);
    await user.click(trackManualBtns[0]);

    // Should now be on the manual entry form with name prefilled
    const nameInput = getByPlaceholderText("accountName") as HTMLInputElement;
    expect(nameInput.value).toBe("HSBC Bank Account");
  });

  test("should submit real bank connection credentials for direct sync bank", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { getByText, getByPlaceholderText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="123456" />,
    );
    await user.click(getByText("addAccount"));
    await user.click(getByText("Connect to Bank"));

    // Select Monzo
    await user.click(getByText("Monzo Bank"));

    // Enter token
    const tokenInput = getByPlaceholderText("Access token from developers.monzo.com...");
    await user.type(tokenInput, "secret-monzo-token");

    // Click Connect Monzo Bank
    await user.click(getByText("Connect Monzo Bank"));

    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      {
        intent: "connectBank",
        institutionId: "monzo",
        token: "secret-monzo-token",
      },
      { method: "POST", action: "/app/accounts" },
    );
  });
});
