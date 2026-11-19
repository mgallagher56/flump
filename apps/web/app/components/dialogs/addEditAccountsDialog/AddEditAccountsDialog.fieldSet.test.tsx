import { fireEvent } from "@testing-library/react";
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

const openAdd = async (accounts: unknown[] = []) => {
  mocks.mockUseLoaderData.mockReturnValue({ user: mockUser, accounts });
  const utils = customRender(<AddEditAccountsDialogBtn />);
  await utils.user.click(utils.getByText("addAccount"));
  return utils;
};

describe("the field set for each type (SD-8)", () => {
  test("a credit card added on Accounts has a rate and a minimum payment, and sends them", async () => {
    const { getByLabelText, getAllByText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), "Credit Card");
    await user.type(getByLabelText("Name"), "Card");
    fireEvent.change(getByLabelText("Interest rate (APR) (optional)"), {
      target: { value: "24.9" },
    });
    fireEvent.change(getByLabelText("Minimum payment each month (optional)"), {
      target: { value: "35" },
    });
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).toMatchObject({
      type: "Credit Card",
      interestRate: "24.9",
      monthlyContribution: "35",
    });
  });

  test("a property asks whether it is the home or a rental, and a loan asks its kind", async () => {
    const { getByLabelText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), "Property");
    expect(
      [...(getByLabelText("Home or rental") as HTMLSelectElement).options].map((o) => o.value),
    ).toEqual(["", "home", "rental"]);
    await user.selectOptions(getByLabelText("Account type"), "Loan");
    expect(
      [...(getByLabelText("Kind of loan (optional)") as HTMLSelectElement).options].map(
        (o) => o.value,
      ),
    ).toEqual(["", "car_finance", "buy_now_pay_later", "other_loan"]);
  });

  test("a mortgage takes its repayment type and term, sent as whole months", async () => {
    const { getByLabelText, getAllByText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), "Mortgage");
    await user.type(getByLabelText("Name"), "Mortgage");
    await user.selectOptions(getByLabelText("How it is repaid (optional)"), "interest-only");
    fireEvent.change(getByLabelText("Years left (optional)"), { target: { value: "24" } });
    fireEvent.change(getByLabelText("Months"), { target: { value: "6" } });
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    // 24 years and 6 months = 24 * 12 + 6 = 294 months.
    expect(submitted()).toMatchObject({ repaymentType: "interest-only", termMonths: "294" });
  });

  test("a joint account's balance says it is the whole balance", async () => {
    const { getByLabelText, getByText, queryByText, user } = await openAdd();
    await user.selectOptions(getByLabelText("Account type"), "Saving");
    expect(queryByText(/whole balance/)).toBeNull();
    await user.selectOptions(getByLabelText("Ownership"), "joint");
    fireEvent.change(getByLabelText("Your share"), { target: { value: "40" } });
    expect(getByText("This is the whole balance. Your share is 40% of it.")).toBeDefined();
  });
});

describe("linking a mortgage to the property it is on", () => {
  const home = { id: "h1", name: "Our house", type: "Property", accountSubtype: "home" };
  const rental = { id: "r1", name: "Flat we let", type: "Property", accountSubtype: "rental" };

  test("lists the properties of the mortgage's kind, preselects one, and sends the link", async () => {
    const { getByLabelText, getAllByText, queryByLabelText, user } = await openAdd([home, rental]);
    await user.selectOptions(getByLabelText("Account type"), "Mortgage");
    await user.type(getByLabelText("Name"), "Mortgage");
    const link = getByLabelText("Which property is this mortgage on") as HTMLSelectElement;
    expect([...link.options].map((o) => o.value)).toEqual(["", "h1"]);
    expect(link.value).toBe("h1");
    expect(queryByLabelText(/What your home is worth/)).toBeNull();

    await user.selectOptions(getByLabelText("Kind of mortgage (optional)"), "btl_mortgage");
    expect(
      [...(getByLabelText("Which property is this mortgage on") as HTMLSelectElement).options].map(
        (o) => o.value,
      ),
    ).toEqual(["", "r1"]);
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).toMatchObject({ linkedAccountId: "r1", accountSubtype: "btl_mortgage" });
    expect(submitted()).not.toHaveProperty("homeValue");
  });

  test("preselects nothing when two properties could be it, and Not linked sends no link", async () => {
    const second = { ...home, id: "h2", name: "Cottage" };
    const { getByLabelText, getAllByText, user } = await openAdd([home, second]);
    await user.selectOptions(getByLabelText("Account type"), "Mortgage");
    await user.type(getByLabelText("Name"), "Mortgage");
    expect((getByLabelText("Which property is this mortgage on") as HTMLSelectElement).value).toBe(
      "",
    );
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).not.toHaveProperty("linkedAccountId");
  });

  test("an edit changes the link and sends only the link", async () => {
    const mortgage = {
      id: "m1",
      name: "Mortgage",
      type: "Mortgage",
      accountSubtype: "residential_mortgage",
      balance: -200000,
      linkedAccountId: null,
    };
    mocks.mockUseLoaderData.mockReturnValue({ accounts: [mortgage, home] });
    const { getByText, getByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="m1" isEditAccount />,
    );
    await user.click(getByText("edit"));
    const link = getByLabelText("Which property is this mortgage on") as HTMLSelectElement;
    expect(link.value).toBe("");
    await user.selectOptions(link, "h1");
    await user.click(getByText("save"));
    const sent = submitted();
    expect(sent).toMatchObject({ intent: "update", accountId: "m1", linkedAccountId: "h1" });
    for (const key of ["name", "type", "balance", "accountSubtype", "ownership", "repaymentType"]) {
      expect(sent).not.toHaveProperty(key);
    }
  });
});

describe("an edit sends only what changed", () => {
  const card = {
    id: "c1",
    name: "Card",
    type: "Credit Card",
    balance: -900,
    interestRate: 19.9,
    monthlyContribution: 30,
    creditLimit: 3000,
    ownership: "sole",
  };

  test("a new rate alone sends the rate alone", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: [card] });
    const { getByText, getByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="c1" isEditAccount />,
    );
    await user.click(getByText("edit"));
    expect((getByLabelText("Interest rate (APR) (optional)") as HTMLInputElement).value).toBe(
      "19.9",
    );
    fireEvent.change(getByLabelText("Interest rate (APR) (optional)"), {
      target: { value: "21.5" },
    });
    await user.click(getByText("save"));
    const sent = submitted();
    expect(sent.interestRate).toBe("21.5");
    for (const key of ["name", "type", "balance", "monthlyContribution", "creditLimit"]) {
      expect(sent).not.toHaveProperty(key);
    }
  });

  test("a type change clears what the new type does not take, and keeps the balance unsent", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: [card] });
    const { getByText, getByLabelText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="c1" isEditAccount />,
    );
    await user.click(getByText("edit"));
    await user.selectOptions(getByLabelText("Account type"), "Loan");
    await user.click(getByText("save"));
    const sent = submitted();
    expect(sent).toMatchObject({ type: "Loan", creditLimit: "" });
    // The rate and payment are shown for a loan too, unchanged, so they are not sent.
    expect(sent).not.toHaveProperty("interestRate");
    // The same amount owed, so no balance is posted (no history row for this month).
    expect(sent).not.toHaveProperty("balance");
  });
});

describe("adding a property for a mortgage (Add an estimate)", () => {
  test("prefills the kind and the mortgage's ownership, and sends the mortgage to link", async () => {
    const { getAllByText, getByLabelText, getByRole, user } = customRender(
      <AddEditAccountsDialogBtn
        initialName="Home (your estimate)"
        initialOwnership="joint"
        initialSharePercent={40}
        initialSubtype="home"
        initialType="Property"
        linkMortgage={{ id: "m1", updatedAt: "2026-01-05T10:00:00.000Z" }}
        openRequestKey={1}
      />,
    );
    expect(getByRole("dialog")).toBeDefined();
    expect((getByLabelText("Home or rental") as HTMLSelectElement).value).toBe("home");
    expect((getByLabelText("Ownership") as HTMLSelectElement).value).toBe("joint");
    expect((getByLabelText("Your share") as HTMLInputElement).value).toBe("40");
    fireEvent.change(getByLabelText("Balance"), { target: { value: "300000" } });
    await user.click(getAllByText("addAccount").at(-1) as HTMLElement);
    expect(submitted()).toMatchObject({
      intent: "create",
      type: "Property",
      accountSubtype: "home",
      ownership: "joint",
      sharePercent: "40",
      balance: "300000",
      linkMortgageId: "m1",
      linkMortgageVersion: "2026-01-05T10:00:00.000Z",
    });
  });
});
