import mockUser from "__mocks__/user";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AddEditAccountsDialogBtn from "./AddEditAccountsDialog";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockFetcherSubmit: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({ submit: mocks.mockFetcherSubmit, state: "idle", data: null }),
  };
});

const submitted = (): Record<string, string> =>
  mocks.mockFetcherSubmit.mock.calls.at(-1)?.[0] as Record<string, string>;

beforeEach(() => {
  mocks.mockFetcherSubmit.mockReset();
  mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, accounts: [] });
});

describe("kind of account", () => {
  test("offers an optional kind for savings and mortgages, and none for a current account", async () => {
    const { getByText, getByLabelText, queryByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn />,
    );
    await user.click(getByText("addAccount"));
    expect(queryByLabelText("Kind of account (optional)")).toBeNull();

    await user.selectOptions(getByLabelText("Account type"), "Saving");
    const kind = getByLabelText("Kind of account (optional)") as HTMLSelectElement;
    expect(kind.value).toBe("");
    expect(kind.options[0]?.text).toBe("Not set");
    expect([...kind.options].map((o) => o.text)).toContain("Cash ISA");

    await user.selectOptions(getByLabelText("Account type"), "Mortgage");
    const mortgage = getByLabelText("Kind of mortgage (optional)") as HTMLSelectElement;
    expect([...mortgage.options].map((o) => o.value)).toEqual([
      "",
      "residential_mortgage",
      "btl_mortgage",
    ]);
  });

  test("clears the chosen kind when the type changes, and sends none it no longer takes", async () => {
    const { getByText, getAllByText, getByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn />,
    );
    await user.click(getByText("addAccount"));
    await user.type(getByLabelText("Name"), "Pot");
    await user.selectOptions(getByLabelText("Account type"), "Saving");
    await user.selectOptions(getByLabelText("Kind of account (optional)"), "notice");
    await user.selectOptions(getByLabelText("Account type"), "Investment");
    expect((getByLabelText("Kind of account (optional)") as HTMLSelectElement).value).toBe("");

    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).toMatchObject({ type: "Investment", accountSubtype: "" });
  });
});

describe("credit limit and 0% date", () => {
  test("show only on a credit card or overdraft, and are sent from there", async () => {
    const { getByText, getAllByText, getByLabelText, getByRole, queryByLabelText, user } =
      customRender(<AddEditAccountsDialogBtn />);
    await user.click(getByText("addAccount"));
    for (const type of ["Current", "Saving", "Loan", "Mortgage"]) {
      await user.selectOptions(getByLabelText("Account type"), type);
      expect(queryByLabelText("Credit limit (optional)")).toBeNull();
      expect(queryByLabelText("0% interest period ends (optional)")).toBeNull();
    }
    await user.selectOptions(getByLabelText("Account type"), "Overdraft");
    expect(getByLabelText("Credit limit (optional)")).toBeDefined();

    await user.selectOptions(getByLabelText("Account type"), "Credit Card");
    await user.type(getByLabelText("Name"), "Card");
    await user.type(getByLabelText("Credit limit (optional)"), "5000");
    // The shared, themed date picker (owner item 20): open it and pick 30 June 2027.
    await user.click(getByRole("button", { name: /^0% interest period ends/ }));
    await user.click(getByRole("button", { name: /^Choose year/ }));
    await user.click(getByRole("button", { name: "2027" }));
    await user.click(getByRole("button", { name: /^Choose month/ }));
    await user.click(getByRole("button", { name: "Jun" }));
    await user.click(getByRole("button", { name: "30 Jun 2027" }));
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).toMatchObject({
      type: "Credit Card",
      creditLimit: "5000",
      promoZeroPercentUntil: "2027-06-30",
    });
    expect(submitted()).not.toHaveProperty("accountSubtype");
  });
});

describe("open request (?add=property)", () => {
  test("opens prefilled when openRequestKey goes up, and not on other prop changes", async () => {
    const { rerender, queryByRole, getByLabelText } = customRender(
      <AddEditAccountsDialogBtn initialName="Home (your estimate)" initialType="Property" />,
    );
    expect(queryByRole("dialog")).toBeNull();

    rerender(
      <AddEditAccountsDialogBtn
        initialName="Home (your estimate)"
        initialType="Property"
        openRequestKey={1}
      />,
    );
    expect(queryByRole("dialog")).not.toBeNull();
    expect((getByLabelText("Name") as HTMLInputElement).value).toBe("Home (your estimate)");
    expect((getByLabelText("Account type") as HTMLSelectElement).value).toBe("Property");
  });

  test("a parent re-render with new prefill props does not reset what was typed", async () => {
    const { rerender, getByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn initialName="Home (your estimate)" openRequestKey={1} />,
    );
    const name = getByLabelText("Name") as HTMLInputElement;
    await user.clear(name);
    await user.type(name, "Flat");
    rerender(<AddEditAccountsDialogBtn initialName="Something else" openRequestKey={1} />);
    expect((getByLabelText("Name") as HTMLInputElement).value).toBe("Flat");
  });
});

describe("ISA kind and joint ownership", () => {
  test("a joint account given an ISA kind says it will be saved as sole, and sends sole", async () => {
    const account = {
      id: "a1",
      name: "Family pot",
      type: "Saving" as const,
      balance: 1000,
      ownership: "joint" as const,
      sharePercent: 50,
    };
    const { getByText, getByLabelText, queryByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn account={account} accountId="a1" isEditAccount />,
    );
    await user.click(getByText("edit"));
    expect(getByLabelText("Ownership")).toBeDefined();

    await user.selectOptions(getByLabelText("Kind of account (optional)"), "cash_isa");
    expect(queryByLabelText("Ownership")).toBeNull();
    expect(
      getByText("An ISA or pension is held in one name, so this account will be saved as sole."),
    ).toBeDefined();

    await user.click(getByText("save"));
    expect(submitted()).toMatchObject({ ownership: "sole", accountSubtype: "cash_isa" });
    expect(submitted()).not.toHaveProperty("sharePercent");
  });
});
