import { fireEvent } from "@testing-library/react";
import mockUser from "__mocks__/user";
import { vi } from "vitest";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import customRender from "~/testUtils/customRender";

/**
 * Characterisation of the Accounts dialog's save body (E12 S8, S5 method). Written against the
 * dialog before its form logic moved into `@flump/finance-engine/account-form`, and kept unchanged
 * after the move: each expected body is worked out by hand from the dialog's rules, in comments.
 *
 * The add rule: name, type and ownership are always sent; the kind when the type has kinds; the
 * credit limit and 0% end date for a card or overdraft; the plan for a student loan; anything else
 * only when it is not empty. The edit rule: only what differs from what the form opened with, the
 * share sent with a changed ownership. A debt's amount owed is sent as minus that amount, 0 as "0".
 */

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

const openAdd = async (accounts: unknown[] = [], partnerMode = false) => {
  mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, accounts });
  const utils = customRender(<AddEditAccountsDialogBtn partnerMode={partnerMode} />);
  await utils.user.click(utils.getByText("addAccount"));
  return utils;
};

const openEdit = async (accounts: unknown[], accountId: string, partnerMode = false) => {
  mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, accounts });
  const utils = customRender(
    <AddEditAccountsDialogBtn accountId={accountId} isEditAccount partnerMode={partnerMode} />,
  );
  await utils.user.click(utils.getByText("edit"));
  return utils;
};

describe("an add sends the fields its type shows", () => {
  // Each type added with the name "X" and 500 typed in the balance (or amount owed) field.
  // Always: intent, requestId, name, type, ownership "sole" (no Partner mode) and the balance.
  // A debt (Mortgage, Loan, Credit Card, Overdraft, Student Loan) sends 500 owed as "-500".
  const cases: [string, Record<string, string>][] = [
    ["Current", { balance: "500" }],
    // Saving and Investment have kinds, so the empty kind is sent too.
    ["Saving", { accountSubtype: "", balance: "500" }],
    ["Investment", { accountSubtype: "", balance: "500" }],
    // A pension has no kind, no credit fields, no plan: nothing empty is sent.
    ["Pension", { balance: "500" }],
    ["Property", { accountSubtype: "", balance: "500" }],
    // A card and an overdraft send the empty credit limit and 0% end date.
    ["Credit Card", { creditLimit: "", promoZeroPercentUntil: "", balance: "-500" }],
    ["Overdraft", { creditLimit: "", promoZeroPercentUntil: "", balance: "-500" }],
    // A mortgage has kinds; with no property to link and no home value typed, neither is sent.
    ["Mortgage", { accountSubtype: "", balance: "-500" }],
    ["Loan", { accountSubtype: "", balance: "-500" }],
    // Owed is money owed to the person, so it is not a debt: 500 stays "500".
    ["Owed", { balance: "500" }],
  ];

  test.each(cases)("%s", async (type, extra) => {
    const { getByLabelText, getAllByText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), type);
    await user.type(getByLabelText("Name"), "X");
    const owed = ["Credit Card", "Overdraft", "Mortgage", "Loan"].includes(type);
    fireEvent.change(getByLabelText(owed ? "Amount owed" : "Balance"), {
      target: { value: "500" },
    });
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).toEqual({
      intent: "create",
      requestId: expect.any(String),
      name: "X",
      type,
      ownership: "sole",
      ...extra,
    });
  });

  test("Student Loan sends its plan, and 500 owed as -500", async () => {
    const { getByLabelText, getAllByText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), "Student Loan");
    await user.type(getByLabelText("Name"), "X");
    await user.selectOptions(getByLabelText("Repayment plan"), "PLAN_2");
    fireEvent.change(getByLabelText("Amount owed"), { target: { value: "500" } });
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).toEqual({
      intent: "create",
      requestId: expect.any(String),
      name: "X",
      type: "Student Loan",
      ownership: "sole",
      studentLoanPlan: "PLAN_2",
      balance: "-500",
    });
  });

  test("a debt of 0 is sent as 0, not -0", async () => {
    const { getByLabelText, getAllByText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), "Loan");
    await user.type(getByLabelText("Name"), "X");
    fireEvent.change(getByLabelText("Amount owed"), { target: { value: "0" } });
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    // |0| = 0, sent as "0" (String(-0) would also be "0", but the rule says so outright).
    expect(submitted().balance).toBe("0");
  });

  test("an empty balance is not sent", async () => {
    const { getByLabelText, getAllByText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), "Loan");
    await user.type(getByLabelText("Name"), "X");
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).not.toHaveProperty("balance");
  });

  test("a joint add in Partner mode sends the share with the ownership", async () => {
    const { getByLabelText, getAllByText, user } = await openAdd([], true);
    await user.selectOptions(getByLabelText("Account type"), "Current");
    await user.type(getByLabelText("Name"), "X");
    await user.selectOptions(getByLabelText("Ownership"), "joint");
    fireEvent.change(getByLabelText("Your share"), { target: { value: "40" } });
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    // Joint with 40 typed: the share is whole and 1 to 99, so 40 stays "40".
    expect(submitted()).toEqual({
      intent: "create",
      requestId: expect.any(String),
      name: "X",
      type: "Current",
      ownership: "joint",
      sharePercent: "40",
    });
  });

  test("a student loan with no plan sends nothing", async () => {
    const { getByLabelText, getAllByText, getByText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), "Student Loan");
    await user.type(getByLabelText("Name"), "X");
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
    expect(getByText("Choose a repayment plan")).toBeDefined();
  });
});

describe("an edit sends only what changed", () => {
  const current = { id: "a1", name: "Monzo", type: "Current", balance: 1200, ownership: "sole" };

  test("1200 typed as 1200.00 against a saved 1200 is not sent", async () => {
    const { getByLabelText, getByText, user } = await openEdit([current], "a1");
    fireEvent.change(getByLabelText("Balance"), { target: { value: "1200.00" } });
    await user.click(getByText("save"));
    // Number("1200") === Number("1200.00"), so the balance is the same: only the ids go.
    expect(submitted()).toEqual({ intent: "update", accountId: "a1" });
  });

  test("a rename sends only the name", async () => {
    const { getByLabelText, getByText, user } = await openEdit([current], "a1");
    await user.clear(getByLabelText("Name"));
    await user.type(getByLabelText("Name"), "Monzo joint");
    await user.click(getByText("save"));
    expect(submitted()).toEqual({ intent: "update", accountId: "a1", name: "Monzo joint" });
  });

  test("a debt's new amount owed is sent as minus that amount, and 0 as 0", async () => {
    const loan = { id: "l1", name: "Loan", type: "Loan", balance: -900, ownership: "sole" };
    const first = await openEdit([loan], "l1");
    // The form opens with 900 owed (|-900|); 500 typed differs, sent as -500.
    fireEvent.change(first.getByLabelText("Amount owed"), { target: { value: "500" } });
    await first.user.click(first.getByText("save"));
    expect(submitted()).toEqual({ intent: "update", accountId: "l1", balance: "-500" });
    first.unmount();

    const second = await openEdit([loan], "l1");
    fireEvent.change(second.getByLabelText("Amount owed"), { target: { value: "0" } });
    await second.user.click(second.getByText("save"));
    expect(submitted()).toEqual({ intent: "update", accountId: "l1", balance: "0" });
  });

  test("a sole account made joint sends the ownership with the default share", async () => {
    const { getByLabelText, getByText, user } = await openEdit([current], "a1", true);
    await user.selectOptions(getByLabelText("Ownership"), "joint");
    await user.click(getByText("save"));
    // The saved sharePercent is missing, so the form holds the default 50.
    expect(submitted()).toEqual({
      intent: "update",
      accountId: "a1",
      ownership: "joint",
      sharePercent: "50",
    });
  });

  test("a joint account's new share alone sends the share alone", async () => {
    const joint = { ...current, ownership: "joint", sharePercent: 40 };
    const { getByLabelText, getByText, user } = await openEdit([joint], "a1", true);
    fireEvent.change(getByLabelText("Your share"), { target: { value: "30" } });
    await user.click(getByText("save"));
    // "40" opened, "30" now: the share changed, the ownership did not.
    expect(submitted()).toEqual({ intent: "update", accountId: "a1", sharePercent: "30" });
  });

  test("a joint account made sole sends the ownership and no share", async () => {
    const joint = { ...current, ownership: "joint", sharePercent: 40 };
    const { getByLabelText, getByText, user } = await openEdit([joint], "a1", true);
    await user.selectOptions(getByLabelText("Ownership"), "sole");
    await user.click(getByText("save"));
    // Sole has no share (""), which differs from "40" but an empty share is never sent.
    expect(submitted()).toEqual({ intent: "update", accountId: "a1", ownership: "sole" });
  });

  test("a joint account's rename sends no share", async () => {
    const joint = { ...current, ownership: "joint", sharePercent: 40 };
    const { getByLabelText, getByText, user } = await openEdit([joint], "a1", true);
    await user.type(getByLabelText("Name"), " 2");
    await user.click(getByText("save"));
    expect(submitted()).toEqual({ intent: "update", accountId: "a1", name: "Monzo 2" });
  });

  test("a mortgage changed to a loan clears every mortgage field the loan lacks", async () => {
    const mortgage = {
      id: "m1",
      name: "Mortgage",
      type: "Mortgage",
      accountSubtype: "residential_mortgage",
      balance: -200000,
      interestRate: 4.5,
      monthlyContribution: 1000,
      termMonths: 300,
      fixedRateEndDate: "2028-01-31",
      repaymentType: "repayment",
      linkedAccountId: "h1",
      ownership: "sole",
    };
    const home = { id: "h1", name: "Our house", type: "Property", accountSubtype: "home" };
    const { getByLabelText, getByText, user } = await openEdit([mortgage, home], "m1");
    await user.selectOptions(getByLabelText("Account type"), "Loan");
    await user.click(getByText("save"));
    // The type change empties the kind (a loan has kinds, so "" is sent against the saved one).
    // 300 months opened as "300"; a loan has no term, fixed rate end, repayment type or link, so
    // each is "" now and sent. The rate (4.5) and payment (1000) show for a loan too, unchanged.
    // 200000 owed opened and still shown, so no balance.
    expect(submitted()).toEqual({
      intent: "update",
      accountId: "m1",
      type: "Loan",
      accountSubtype: "",
      termMonths: "",
      fixedRateEndDate: "",
      repaymentType: "",
      linkedAccountId: "",
    });
  });
});

describe("linking a mortgage and the home value", () => {
  const home = { id: "h1", name: "Our house", type: "Property", accountSubtype: "home" };
  const unkinded = { id: "p2", name: "Plot", type: "Property", accountSubtype: null };

  test("adding a mortgage with no property asks for the home value and sends it", async () => {
    const { getByLabelText, getAllByText, queryByLabelText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), "Mortgage");
    await user.type(getByLabelText("Name"), "Mortgage");
    expect(queryByLabelText("Which property is this mortgage on")).toBeNull();
    fireEvent.change(getByLabelText("What your home is worth (optional)"), {
      target: { value: "350000" },
    });
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).toEqual({
      intent: "create",
      requestId: expect.any(String),
      name: "Mortgage",
      type: "Mortgage",
      ownership: "sole",
      accountSubtype: "",
      homeValue: "350000",
    });
  });

  test("a buy-to-let mortgage with no rental asks what the property is worth", async () => {
    const { getByLabelText, queryByLabelText, user } = await openAdd([home]);
    await user.selectOptions(getByLabelText("Account type"), "Mortgage");
    await user.selectOptions(getByLabelText("Kind of mortgage (optional)"), "btl_mortgage");
    // The only property is a home, so a BTL mortgage has none to link: the value is asked.
    expect(queryByLabelText("Which property is this mortgage on")).toBeNull();
    expect(getByLabelText("What the property is worth (optional)")).toBeDefined();
  });

  test("a property with no kind saved is listed, and one listed is preselected", async () => {
    const { getByLabelText, getAllByText, queryByLabelText, user } = await openAdd([unkinded]);
    await user.selectOptions(getByLabelText("Account type"), "Mortgage");
    await user.type(getByLabelText("Name"), "Mortgage");
    const link = getByLabelText("Which property is this mortgage on") as HTMLSelectElement;
    expect([...link.options].map((o) => o.value)).toEqual(["", "p2"]);
    expect(link.value).toBe("p2");
    expect(queryByLabelText(/What your home is worth/)).toBeNull();
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).toEqual({
      intent: "create",
      requestId: expect.any(String),
      name: "Mortgage",
      type: "Mortgage",
      ownership: "sole",
      accountSubtype: "",
      linkedAccountId: "p2",
    });
  });

  test("choosing Not linked keeps the preselection off", async () => {
    const { getByLabelText, getAllByText, user } = await openAdd([home]);
    await user.selectOptions(getByLabelText("Account type"), "Mortgage");
    await user.type(getByLabelText("Name"), "Mortgage");
    await user.selectOptions(getByLabelText("Which property is this mortgage on"), "");
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).not.toHaveProperty("linkedAccountId");
  });

  test("an edit never asks for the home value, and does not preselect the one property", async () => {
    const mortgage = { id: "m1", name: "Mortgage", type: "Mortgage", balance: -1000 };
    const { getByLabelText, queryByLabelText } = await openEdit([mortgage, home], "m1");
    expect((getByLabelText("Which property is this mortgage on") as HTMLSelectElement).value).toBe(
      "",
    );
    expect(queryByLabelText(/What your home is worth/)).toBeNull();
  });

  test("an edited BTL mortgage still lists the home it is linked to", async () => {
    const mortgage = {
      id: "m1",
      name: "Mortgage",
      type: "Mortgage",
      accountSubtype: "btl_mortgage",
      balance: -1000,
      linkedAccountId: "h1",
    };
    const { getByLabelText } = await openEdit([mortgage, home], "m1");
    const link = getByLabelText("Which property is this mortgage on") as HTMLSelectElement;
    expect([...link.options].map((o) => o.value)).toEqual(["", "h1"]);
    expect(link.value).toBe("h1");
  });
});
