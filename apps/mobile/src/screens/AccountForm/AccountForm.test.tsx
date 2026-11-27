import { ACCOUNT_FORM_TYPES, accountFieldSet } from "@flump/finance-engine/account-form";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Alert } from "react-native";
import { Text } from "../../components/Text";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import { household, NOW, routes } from "../../features/check-in/checkInTestData";
import { AccountFormScreen, type AccountFormScreenProps } from "./AccountForm";

type Open = AccountFormScreenProps["open"];

async function form(api: ReturnType<typeof fakeApi>, open: Open) {
  const props = {
    onSaved: jest.fn(),
    onDeleted: jest.fn(),
    onCancel: jest.fn(),
    onBackToAccounts: jest.fn(),
  };
  const { ui } = withApi(
    <AccountFormScreen
      {...props}
      open={open}
      header={(title) => <Text testID="header-title">{title}</Text>}
    />,
    api.client,
  );
  await render(ui);
  await screen.findByTestId("account-form");
  return props;
}

const settle = () => act(async () => jest.advanceTimersByTimeAsync(0));
const type = (id: string, text: string) => fireEvent.changeText(screen.getByTestId(id), text);
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
/** Opens a select's sheet and chooses one of its options. */
async function choose(select: string, value: string) {
  await press(select);
  await press(`${select}-option-${value}`);
}
const save = async () => {
  await press("account-form-save");
  await settle();
};

const ID = "0f6b1c1e-3c55-4f43-9a52-1f4c9f6f2a11";
const created = (body: unknown) => ({ id: ID, ...(body as object) });
const posts = (api: ReturnType<typeof fakeApi>) => api.calls.filter((c) => c.method !== "GET");

// The first render in a file pays the cold module load (as the S6 screens): taken here.
beforeAll(async () => {
  await form(fakeApi(routes(household())), { kind: "add" });
  screen.unmount();
}, 30_000);

describe("AccountForm: add", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("shows web's title and starts as a current account with web's fields", async () => {
    await form(fakeApi(routes(household())), { kind: "add" });
    expect(screen.getByTestId("header-title")).toHaveTextContent("Add account");
    expect(screen.getByTestId("account-form-type").props.accessibilityLabel).toBe(
      "Account type, Current account",
    );
    expect(screen.getByLabelText("Balance")).toBeOnTheScreen();
    expect(screen.queryByTestId("account-form-rate")).toBeNull();
    expect(screen.queryByTestId("account-form-delete")).toBeNull();
  });

  it.each(ACCOUNT_FORM_TYPES)("%s shows exactly the shared field set's fields", async (t) => {
    await form(fakeApi(routes(household())), { kind: "add" });
    await choose("account-form-type", t);
    const set = accountFieldSet({ type: t, name: "", accountSubtype: "" });
    const shown = (id: string) => screen.queryByTestId(id) !== null;
    expect(shown("account-form-kind")).toBe(set.kind !== null);
    expect(shown("account-form-rate")).toBe(set.interestRate !== null);
    expect(shown("account-form-monthly")).toBe(set.monthlyContribution !== null);
    expect(shown("account-form-plan")).toBe(set.studentLoanPlan);
    expect(shown("account-form-credit-limit")).toBe(set.creditFields);
    expect(shown("account-form-promo")).toBe(set.creditFields);
    expect(shown("account-form-repaid")).toBe(set.mortgageFields);
    expect(shown("account-form-years")).toBe(set.mortgageFields);
    if (set.interestRate) expect(screen.getByLabelText(set.interestRate.label)).toBeOnTheScreen();
    // A debt asks for the amount owed.
    const owed = ["Mortgage", "Loan", "Credit Card", "Overdraft", "Student Loan"].includes(t);
    expect(screen.queryByLabelText(owed ? "Amount owed" : "Balance")).toBeOnTheScreen();
  });

  it("adds a savings account with the fields its type shows and one key for the opening", async () => {
    const api = fakeApi(routes(household(), { "POST /accounts": created }));
    const props = await form(api, { kind: "add" });
    await type("account-form-name", "Holiday fund");
    await choose("account-form-type", "Saving");
    await choose("account-form-kind", "easy_access");
    await type("account-form-balance", "1,250.50");
    await type("account-form-rate", "4.1");
    await save();
    const [call] = posts(api);
    expect(call).toMatchObject({
      method: "POST",
      path: "/accounts",
      body: {
        name: "Holiday fund",
        type: "Saving",
        accountSubtype: "easy_access",
        balance: 1250.5,
        interestRate: 4.1,
        ownership: "sole",
      },
    });
    expect(call?.idempotencyKey).toMatch(/:account$/);
    expect(props.onSaved).toHaveBeenCalledWith();
  });

  it("a debt's amount owed of £500 is sent as -500 (web's sign rule)", async () => {
    const api = fakeApi(routes(household(), { "POST /accounts": created }));
    await form(api, { kind: "add" });
    await type("account-form-name", "Card");
    await choose("account-form-type", "Credit Card");
    await type("account-form-balance", "500");
    await save();
    expect(posts(api)[0]?.body).toMatchObject({ type: "Credit Card", balance: -500 });
  });

  it("an overdrawn current account can be added below zero", async () => {
    const api = fakeApi(routes(household(), { "POST /accounts": created }));
    await form(api, { kind: "add" });
    await type("account-form-name", "Everyday");
    await type("account-form-balance", "-120");
    await save();
    expect(posts(api)[0]?.body).toMatchObject({ type: "Current", balance: -120 });
  });

  it("a retry after a failure reuses the same key, so it never adds twice", async () => {
    let first = true;
    const api = fakeApi(
      routes(household(), {
        "POST /accounts": (body) => {
          if (first) {
            first = false;
            fail("unavailable");
          }
          return created(body);
        },
      }),
    );
    const props = await form(api, { kind: "add" });
    await type("account-form-name", "Holiday fund");
    await type("account-form-balance", "10");
    await save();
    expect(screen.getByTestId("account-form-alert")).toHaveTextContent(
      "We could not reach Flump. Check your connection and try again.",
    );
    expect(props.onSaved).not.toHaveBeenCalled();
    await save();
    const [a, b] = posts(api);
    expect(a?.idempotencyKey).toBeDefined();
    expect(b?.idempotencyKey).toBe(a?.idempotencyKey);
    expect(props.onSaved).toHaveBeenCalledTimes(1);
  });

  it("says what to change and sends nothing: no name, no balance, a student loan with no plan", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const api = fakeApi(routes(household()));
    await form(api, { kind: "add" });
    await choose("account-form-type", "Student Loan");
    await save();
    expect(screen.getByText("Enter a name for this account.")).toBeOnTheScreen();
    expect(screen.getByText("Enter the amount owed. Use 0 if nothing is owed.")).toBeOnTheScreen();
    expect(screen.getByText("Choose a repayment plan")).toBeOnTheScreen();
    expect(screen.getByTestId("account-form-alert")).toHaveTextContent(
      "Some details need changing. Each one says what to change.",
    );
    expect(posts(api)).toEqual([]);
    // Read out on both platforms, since the alert is at the top and Save at the bottom.
    expect(announce).toHaveBeenCalledWith(
      "Some details need changing. Each one says what to change.",
    );
  });

  it("a rate above 100 and an amount it cannot read say so under the field", async () => {
    const api = fakeApi(routes(household()));
    await form(api, { kind: "add" });
    await type("account-form-name", "Savings");
    await choose("account-form-type", "Saving");
    await type("account-form-balance", "1,5,0.123");
    await type("account-form-rate", "100.5");
    await save();
    expect(screen.getByText("Enter an amount in pounds, such as 250 or 250.50.")).toBeOnTheScreen();
    expect(screen.getByText("Enter a percentage from 0 to 100.")).toBeOnTheScreen();
    expect(posts(api)).toEqual([]);
    // 100 itself is allowed (web's PercentInput max is 100).
    await type("account-form-rate", "100");
    await type("account-form-balance", "150");
    await save();
    expect(posts(api)).toHaveLength(1);
  });

  it("a mortgage with no property to link adds both through the pair route", async () => {
    const api = fakeApi(
      routes(household([{ name: "Current account", type: "Current", balance: 100, nov: 100 }]), {
        "POST /accounts/mortgage-with-property": () => ({
          mortgage: { id: ID },
          property: { id: "9a7b6c5d-1e2f-4a3b-8c9d-0e1f2a3b4c5d" },
        }),
      }),
    );
    await form(api, { kind: "add" });
    await type("account-form-name", "Mortgage");
    await choose("account-form-type", "Mortgage");
    await type("account-form-balance", "200000");
    expect(screen.getByLabelText("What your home is worth (optional)")).toBeOnTheScreen();
    await type("account-form-home-value", "300000");
    await save();
    const [call] = posts(api);
    expect(call?.path).toBe("/accounts/mortgage-with-property");
    expect(call?.body).toMatchObject({
      mortgage: { name: "Mortgage", balance: -200000 },
      property: { balance: 300000 },
    });
    expect(call?.idempotencyKey).toMatch(/:mortgage$/);
  });

  it("joint ownership shows with partner mode; the share is sent, and 0 is refused", async () => {
    const h = household();
    const api = fakeApi(
      routes(h, {
        "GET /user-profile": () => ({ ...h.profile, partnerMode: true }),
        "POST /accounts": created,
      }),
    );
    await form(api, { kind: "add" });
    await type("account-form-name", "Joint savings");
    await choose("account-form-type", "Saving");
    await type("account-form-balance", "8000");
    await choose("account-form-ownership", "joint");
    // A joint account's balance is the whole of it, and the field says so.
    expect(
      screen.getByText("This is the whole balance. Your share is 50% of it."),
    ).toBeOnTheScreen();
    await type("account-form-share", "0");
    await save();
    expect(
      screen.getByText("Enter your share as a whole percentage from 1 to 99."),
    ).toBeOnTheScreen();
    expect(posts(api)).toEqual([]);
    await type("account-form-share", "40");
    await save();
    expect(posts(api)[0]?.body).toMatchObject({ ownership: "joint", sharePercent: 40 });
  });

  it("no ownership choice on a new account without partner mode", async () => {
    await form(fakeApi(routes(household())), { kind: "add" });
    await choose("account-form-type", "Saving");
    expect(screen.queryByTestId("account-form-ownership")).toBeNull();
  });
});

describe("AccountForm: loading", () => {
  afterEach(() => jest.useRealTimers());

  it("nothing for 200 ms while the accounts load, then a busy placeholder", async () => {
    jest.useFakeTimers();
    const { ui } = withApi(
      <AccountFormScreen
        open={{ kind: "add" }}
        onSaved={jest.fn()}
        onDeleted={jest.fn()}
        onCancel={jest.fn()}
        onBackToAccounts={jest.fn()}
      />,
      fakeApi(routes(household(), { "GET /accounts": () => new Promise(() => {}) })).client,
    );
    await render(ui);
    expect(screen.queryByTestId("account-form-skeleton")).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(250));
    expect(screen.getByTestId("account-form-skeleton")).toBeOnTheScreen();
    expect(screen.queryByTestId("account-form")).toBeNull();
  });
});

describe("AccountForm: edit and delete", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("an edit that changes only the name sends only the name, with If-Match", async () => {
    const h = household();
    const id = h.idOf("Mortgage");
    const api = fakeApi(routes(h, { [`PATCH /accounts/${id}`]: () => ({ id }) }));
    const props = await form(api, { kind: "edit", id });
    expect(screen.getByTestId("header-title")).toHaveTextContent("Edit account");
    expect(screen.getByTestId("account-form-name").props.value).toBe("Mortgage");
    await type("account-form-name", "Home loan");
    await save();
    expect(posts(api)).toEqual([
      {
        method: "PATCH",
        path: `/accounts/${id}`,
        body: { name: "Home loan" },
        ifMatch: `"${NOW().toISOString()}"`,
      },
    ]);
    expect(props.onSaved).toHaveBeenCalledTimes(1);
  });

  it("an edit with nothing changed sends nothing and closes", async () => {
    const h = household();
    const api = fakeApi(routes(h));
    const props = await form(api, { kind: "edit", id: h.idOf("Mortgage") });
    await save();
    expect(posts(api)).toEqual([]);
    expect(props.onSaved).toHaveBeenCalledTimes(1);
  });

  it("a 412 says it changed somewhere else and keeps what was typed", async () => {
    const h = household();
    const id = h.idOf("Mortgage");
    const api = fakeApi(routes(h, { [`PATCH /accounts/${id}`]: () => fail("client", 412) }));
    const props = await form(api, { kind: "edit", id });
    await type("account-form-name", "Home loan");
    await save();
    expect(screen.getByTestId("account-form-alert")).toHaveTextContent(
      "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.",
    );
    expect(screen.getByTestId("account-form-name").props.value).toBe("Home loan");
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it("after a 412 the next save sends the version read again", async () => {
    const h = household();
    const id = h.idOf("Mortgage");
    const NEWER = "2026-11-21T08:30:00.000Z";
    let version = NOW().toISOString();
    let tries = 0;
    const api = fakeApi(
      routes(h, {
        "GET /accounts": () => h.accounts.map((a) => ({ ...a, updatedAt: version })),
        [`PATCH /accounts/${id}`]: () => {
          tries += 1;
          if (tries === 1) {
            // Changed somewhere else: the saved version moves on and this save is refused.
            version = NEWER;
            fail("client", 412);
          }
          return { id };
        },
      }),
    );
    const props = await form(api, { kind: "edit", id });
    await type("account-form-name", "Home loan");
    await save();
    await settle();
    await save();
    const patches = posts(api).map((c) => c.ifMatch);
    expect(patches).toEqual([`"${NOW().toISOString()}"`, `"${NEWER}"`]);
    expect(props.onSaved).toHaveBeenCalledTimes(1);
  });

  it("a delete leaves the form at once, never showing the account as not found", async () => {
    jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      void buttons?.[1]?.onPress?.();
    });
    const h = household();
    const id = h.idOf("Mortgage");
    const api = fakeApi(
      routes(h, {
        [`DELETE /accounts/${id}`]: () => ({ success: true }),
        // The list read after the delete never answers: the form must not wait for it.
        "GET /accounts": (() => {
          let first = true;
          return () => {
            if (first) {
              first = false;
              return h.accounts;
            }
            return new Promise(() => {});
          };
        })(),
      }),
    );
    const props = await form(api, { kind: "edit", id });
    await press("account-form-delete");
    await settle();
    expect(props.onDeleted).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("We cannot find that account.")).toBeNull();
  });

  it("delete asks first, saying what is removed; Cancel sends nothing", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const h = household();
    const id = h.idOf("Mortgage");
    const api = fakeApi(routes(h, { [`DELETE /accounts/${id}`]: () => ({ success: true }) }));
    const props = await form(api, { kind: "edit", id });
    await press("account-form-delete");
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alert.mock.calls[0] ?? [];
    expect(title).toBe("Delete Mortgage?");
    expect(message).toBe("Its balance history will be deleted too. This cannot be undone.");
    expect(buttons?.map((b) => b.text)).toEqual(["Cancel", "Delete Mortgage"]);
    await act(async () => buttons?.[0]?.onPress?.());
    expect(posts(api)).toEqual([]);

    await press("account-form-delete");
    const again = alert.mock.calls[1]?.[2];
    await act(async () => again?.[1]?.onPress?.());
    await settle();
    expect(posts(api)).toEqual([{ method: "DELETE", path: `/accounts/${id}`, body: undefined }]);
    expect(props.onDeleted).toHaveBeenCalledTimes(1);
  });

  it("an account that is not in the list says so with Back to accounts", async () => {
    const props = await form(fakeApi(routes(household())), { kind: "edit", id: ID });
    expect(screen.getByText("We cannot find that account.")).toBeOnTheScreen();
    await press("account-form-back");
    expect(props.onBackToAccounts).toHaveBeenCalledTimes(1);
  });

  it("a debt turned into something owned says what that does to net worth", async () => {
    const h = household();
    await form(fakeApi(routes(h)), { kind: "edit", id: h.idOf("Mortgage") });
    expect(screen.queryByTestId("account-form-type-flips-sign")).toBeNull();
    await choose("account-form-type", "Saving");
    expect(screen.getByTestId("account-form-type-flips-sign")).toHaveTextContent(
      /rises by twice its balance/,
    );
  });
});
