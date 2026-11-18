import { fireEvent } from "@testing-library/react";
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

describe("Add account fields", () => {
  test("have no placeholder repeating the label or a 0.00 balance, and every button is named", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { getByLabelText, getAllByRole, getByText, user } = customRender(
      <AddEditAccountsDialogBtn />,
    );
    await user.click(getByText("addAccount"));
    expect(getByLabelText("Name").hasAttribute("placeholder")).toBe(false);
    expect(getByLabelText("Balance").hasAttribute("placeholder")).toBe(false);
    for (const button of getAllByRole("button")) {
      expect(button.textContent?.trim() || button.getAttribute("aria-label")).toBeTruthy();
    }
  });
});

describe("before hydration (#701)", () => {
  test("with fallbackHref the trigger is a real link, and a click opens the dialog in place", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { getByRole, user } = customRender(
      <AddEditAccountsDialogBtn fallbackHref="/app/accounts?add=1" variant="primary" />,
    );
    const link = getByRole("link", { name: "addAccount" });
    expect(link.getAttribute("href")).toBe("/app/accounts?add=1");
    await user.click(link);
    expect(getByRole("dialog")).toBeDefined();
  });

  test("defaultOpen opens the dialog on first render (arrived through the link)", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { getByRole } = customRender(
      <AddEditAccountsDialogBtn defaultOpen fallbackHref="/app/accounts?add=1" variant="primary" />,
    );
    expect(getByRole("dialog")).toBeDefined();
  });
});

describe("adding a mortgage with the home's value", () => {
  const openAsMortgage = async (accounts: unknown[] = []) => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, accounts });
    const utils = customRender(<AddEditAccountsDialogBtn />);
    await utils.user.click(utils.getByText("addAccount"));
    await utils.user.selectOptions(utils.getByLabelText("Account type"), "Mortgage");
    return utils;
  };

  test("offers the home value for a new mortgage when no property is saved, and sends it", async () => {
    mocks.mockFetcherSubmit.mockClear();
    const { getByLabelText, getByText, getByTestId, getAllByText, user } = await openAsMortgage();
    expect(
      getByText(
        "Your own estimate. We add it as your home, so you do not need a separate property account.",
      ),
    ).toBeDefined();
    fireEvent.change(getByLabelText("Amount owed"), { target: { value: "200000" } });
    fireEvent.change(getByLabelText(/^What your home is worth \(optional\)/), {
      target: { value: "300000" },
    });
    // 300,000 - 200,000 = 100,000.
    expect(getByTestId("home-equity-line").textContent).toContain("£100,000");
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(mocks.mockFetcherSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "create", type: "Mortgage", homeValue: "300000" }),
      { method: "POST" },
    );
  });

  test("is not offered when a residential property is already saved", async () => {
    const { queryByLabelText, queryByText } = await openAsMortgage([
      { id: "h1", name: "Home (your estimate)", type: "Property", balance: 300000 },
    ]);
    expect(queryByLabelText(/What your home is worth/)).toBeNull();
    expect(queryByText(/separate property account/)).toBeNull();
  });

  test("is still offered when the only saved property is buy to let, as the action decides", async () => {
    const { getByLabelText } = await openAsMortgage([
      { id: "b1", name: "Buy to let flat", type: "Property", balance: 200000 },
    ]);
    expect(getByLabelText(/^What your home is worth/)).toBeDefined();
  });

  test("is not offered for a buy-to-let mortgage, by kind or by name", async () => {
    const { getByLabelText, queryByLabelText, user } = await openAsMortgage();
    expect(getByLabelText(/^What your home is worth/)).toBeDefined();
    await user.selectOptions(getByLabelText("Kind of mortgage (optional)"), "btl_mortgage");
    expect(queryByLabelText(/What your home is worth|What the property is worth/)).toBeNull();
    await user.selectOptions(getByLabelText("Kind of mortgage (optional)"), "");
    fireEvent.change(getByLabelText("Name"), { target: { value: "Buy to let flat" } });
    expect(queryByLabelText(/What your home is worth|What the property is worth/)).toBeNull();
  });

  test("treats a negative typed balance as no mortgage balance in the equity line", async () => {
    const { getByLabelText, getByTestId } = await openAsMortgage();
    fireEvent.change(getByLabelText("Amount owed"), { target: { value: "-5000" } });
    fireEvent.change(getByLabelText(/^What your home is worth \(optional\)/), {
      target: { value: "300000" },
    });
    // A balance below 0 counts as none: 300,000 - 0 = 300,000, never 300,000 + 5,000.
    const line = getByTestId("home-equity-line");
    expect(line.textContent).toContain("£300,000");
    expect(line.textContent).not.toContain("£305,000");
  });

  test("is not offered for other account types", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, accounts: [] });
    const { getByText, queryByLabelText, user } = customRender(<AddEditAccountsDialogBtn />);
    await user.click(getByText("addAccount"));
    expect(queryByLabelText(/What your home is worth/)).toBeNull();
  });

  test("is not offered when editing a mortgage", async () => {
    mocks.mockUseLoaderData.mockReturnValue({
      user: mockUser,
      accounts: [{ id: "m1", name: "Mortgage", type: "Mortgage", balance: -200000 }],
    });
    const { getByRole, queryByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="m1" isEditAccount isIconButton />,
    );
    await user.click(getByRole("button"));
    expect(queryByLabelText(/What your home is worth/)).toBeNull();
  });
});
