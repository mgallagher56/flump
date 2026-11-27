import { etagFor } from "@flump/api-contract";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Alert, type AlertButton, Linking } from "react-native";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import {
  RENTER_BUDGET,
  RENTER_FACTS,
  renterHousehold,
  withJoint,
} from "../../features/budget/budgetTestData";
import { household, NOW, routes } from "../../features/check-in/checkInTestData";
import { refreshControl } from "../../testing/refresh";
import { Budget, type BudgetWebLinks } from "./Budget";

/** The website's pages (placeholder addresses). */
const LINKS: BudgetWebLinks = {
  setUp: { url: "https://app.test.invalid/app/onboarding", exact: true },
  budget: { url: "https://app.test.invalid/app/budget", exact: true },
  mortgage: { url: "https://app.test.invalid/app/mortgage", exact: true },
  salary: { url: "https://app.test.invalid/app/profile#settings-age-and-pay", exact: true },
};

type Api = ReturnType<typeof fakeApi>;

async function budget(api: Api, now: () => Date = NOW) {
  const onSignOut = jest.fn();
  const onOpenAccounts = jest.fn();
  const { ui, queryClient } = withApi(
    <Budget
      onSignOut={onSignOut}
      onOpenAccounts={onOpenAccounts}
      marketingOrigin="https://m.test.invalid"
      links={LINKS}
      now={now}
    />,
    api.client,
  );
  await render(ui);
  return { onSignOut, onOpenAccounts, queryClient };
}

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
/** Lets every read answer and the screen hear of it, inside act. */
const settle = () => act(async () => jest.advanceTimersByTimeAsync(0));
/** The renter's left over, read out as one item. */
const HERO = /^Left over each month, £125, /;

/** Every test id on screen, in the order a screen reader meets them. */
function testIdsInOrder(): string[] {
  const ids: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { props?: { testID?: string }; children?: unknown[] };
    if (n.props?.testID) ids.push(n.props.testID);
    for (const child of n.children ?? []) walk(child);
  };
  const json = screen.toJSON();
  for (const root of Array.isArray(json) ? json : [json]) walk(root);
  return ids;
}

/** Presses the confirm button of the platform alert the last Alert.alert call opened. */
async function confirmAlert(alert: jest.SpyInstance, label: string) {
  const buttons = (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  await act(async () => buttons.find((b) => b.text === label)?.onPress?.());
}

/** Opens the editor and the edit sheet for one entry. */
async function openEntry(name: RegExp) {
  await user().press(screen.getByRole("button", { name: "Edit budget" }));
  await user().press(screen.getByRole("button", { name }));
  expect(await screen.findByTestId("budget-entry-sheet")).toBeOnTheScreen();
}

beforeAll(async () => {
  // The first render in a file loads the engine and React Native's components (as Home's).
  await budget(fakeApi(routes(renterHousehold())));
  await screen.findByTestId("budget-hero");
  screen.unmount();
}, 30_000);

describe("Budget", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("phone equals web", () => {
    it("the renter's figures are what web's BudgetOverview shows for the same rows", async () => {
      await budget(fakeApi(routes(renterHousehold())));
      // By hand (personas.ts RENTER, as budget-page.parity.test.ts): money in 2,085; going out
      // essentials 950 + 115 + 80 + 40 + 250 + 120 + 60 = 1,615, other 90 + 25 + 80 = 195,
      // savings 150, so 1,615 + 195 + 150 = 1,960; left over 2,085 - 1,960 = 125.
      expect(await screen.findByLabelText(HERO)).toBeOnTheScreen();
      expect(screen.getByLabelText("Money in each month, £2,085, After tax")).toBeOnTheScreen();
      expect(
        screen.getByLabelText("Going out each month, £1,960, Bills, spending and savings"),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText("Money in minus Going out equals Left over")).toBeOnTheScreen();
      expect(screen.getByText("Money in − Going out = Left over")).toBeOnTheScreen();
      // Where the money goes, ranked: housing 950; expenses 250 + 120 + 90 + 25 + 80 = 565;
      // bills 115 + 80 + 40 + 60 = 295; savings 150. Income is not a spending category.
      expect(
        screen
          .getAllByRole("button")
          .map((b) => b.props.accessibilityLabel)
          .filter(
            (l: string | undefined) => l && /^(Housing|Expenses|Bills|Savings|Income)/.test(l),
          ),
      ).toEqual(["Housing, Renting, £950", "Expenses, £565", "Bills, £295", "Savings, £150"]);
    });

    it("shows web's sections in web's order", async () => {
      await budget(fakeApi(routes(renterHousehold())));
      await screen.findByLabelText(HERO);
      const order = [
        "budget-hero",
        "budget-figures",
        "budget-equation",
        "budget-categories",
        "breathing-room",
        "runway",
        "debt-help-link",
      ];
      const ids = testIdsInOrder().filter((id) => order.includes(id));
      expect(ids).toEqual(order);
      expect(screen.getByRole("header", { name: "Your budget" })).toBeOnTheScreen();
      expect(
        screen.getByText("Your income, spending and how long your money lasts."),
      ).toBeOnTheScreen();
      // The hero's sub-line names safe to spend first, as web's.
      expect(screen.getByLabelText(HERO).props.accessibilityLabel).toMatch(
        /Safe to spend before flexible spending: £[\d,]+ a month, after essential spending, debt payments and savings\.$/,
      );
    });
  });

  describe("states", () => {
    it("loading: nothing at first, then the hero's blocks, then the figures", async () => {
      let answer: (rows: unknown) => void = () => undefined;
      const h = renterHousehold();
      await budget(
        fakeApi(routes(h, { "GET /budget-entries": () => new Promise((r) => (answer = r)) })),
      );
      await settle();
      expect(screen.queryByTestId("budget-hero-loading")).toBeNull();
      await act(async () => jest.advanceTimersByTimeAsync(250));
      expect(screen.getByLabelText("Loading your budget")).toBeOnTheScreen();
      await act(async () => answer(h.budgetEntries));
      await act(async () => jest.advanceTimersByTimeAsync(500));
      expect(screen.getByLabelText(HERO)).toBeOnTheScreen();
    });

    it("no budget: web's empty words and the website, never £0", async () => {
      await budget(fakeApi(routes(renterHousehold([]))));
      expect(await screen.findByText("No budget yet")).toBeOnTheScreen();
      expect(
        screen.getByText(
          "Add your income and what you spend each month to see what is left over and how long your money lasts.",
        ),
      ).toBeOnTheScreen();
      expect(screen.queryByText("£0")).toBeNull();
      expect(screen.queryByTestId("budget-hero")).toBeNull();
      // The debt help line is for everyone, empty budget included.
      expect(screen.getByTestId("debt-help-link")).toBeOnTheScreen();
      await user().press(
        screen.getByRole("link", { name: "Add common budget items on the website" }),
      );
      expect(Linking.openURL).toHaveBeenCalledWith("https://app.test.invalid/app/budget");
    });

    it("a budget of £0 rows only is empty too (the engine's rule)", async () => {
      await budget(
        fakeApi(routes(renterHousehold([{ name: "Rent", category: "housing", amount: 0 }]))),
      );
      expect(await screen.findByText("No budget yet")).toBeOnTheScreen();
    });

    it("a failed budget read is an error with Try again, never No budget yet", async () => {
      let down = true;
      const h = renterHousehold();
      const api = fakeApi(
        routes(h, {
          "GET /budget-entries": () => (down ? fail("unavailable", 503) : h.budgetEntries),
        }),
      );
      await budget(api);
      await act(async () => jest.advanceTimersByTimeAsync(10_000));
      expect(screen.getByTestId("budget-error")).toBeOnTheScreen();
      expect(screen.getByText("Check your connection and try again.")).toBeOnTheScreen();
      expect(screen.queryByText("No budget yet")).toBeNull();
      expect(screen.queryByText("£0")).toBeNull();
      down = false;
      await user().press(screen.getByTestId("budget-retry"));
      await settle();
      expect(screen.getByLabelText(HERO)).toBeOnTheScreen();
    });

    it("a budget the app cannot read is out of step, not a connection problem", async () => {
      const h = renterHousehold();
      await budget(fakeApi(routes(h, { "GET /budget-entries": () => [{ id: "x" }] })));
      expect(await screen.findByTestId("budget-error")).toBeOnTheScreen();
      expect(screen.queryByText("Check your connection and try again.")).toBeNull();
      expect(screen.queryByText("No budget yet")).toBeNull();
    });

    it("not set up: the set-up screen", async () => {
      const h = renterHousehold();
      await budget(
        fakeApi(
          routes(h, { "GET /user-profile": () => ({ ...h.profile, onboardingCompleted: false }) }),
        ),
      );
      await settle();
      expect(await screen.findByRole("link", { name: /website/ })).toBeOnTheScreen();
      expect(screen.queryByTestId("budget")).toBeNull();
    });

    it("terms changed: the terms screen", async () => {
      const h = renterHousehold();
      await budget(
        fakeApi(
          routes(h, {
            "GET /budget-entries": () => fail("forbidden", 403, "terms_not_accepted"),
          }),
        ),
      );
      await settle();
      expect(screen.queryByTestId("budget")).toBeNull();
      expect(screen.queryByText("No budget yet")).toBeNull();
    });

    it("take-home not set: Not set with web's prompt and the salary link, never £0", async () => {
      const h = renterHousehold([
        {
          name: "Take-home pay",
          category: "income",
          amount: 0,
          isIncome: true,
          linkKind: "take_home",
        },
        { name: "Rent", category: "housing", amount: 950, isEssential: true },
      ]);
      await budget(
        fakeApi(
          routes(h, {
            "GET /user-profile": () => ({
              ...h.profile,
              annualSalary: null,
              monthlyTakeHome: null,
            }),
          }),
        ),
      );
      expect(
        await screen.findByText("Your take-home pay is not set, so what is left over is unknown."),
      ).toBeOnTheScreen();
      expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
      expect(screen.queryByText("£0")).toBeNull();
      await user().press(screen.getByRole("link", { name: "Add your salary on the website" }));
      expect(Linking.openURL).toHaveBeenCalledWith(
        "https://app.test.invalid/app/profile#settings-age-and-pay",
      );
    });

    it("refused: no Scottish rates for the year, so the notice in place of the figure", async () => {
      const h = renterHousehold([
        {
          name: "Salary after tax",
          category: "income",
          amount: 0,
          isIncome: true,
          linkKind: "take_home",
        },
        { name: "Rent", category: "housing", amount: 950, isEssential: true },
      ]);
      await budget(
        fakeApi(
          routes(h, { "GET /user-profile": () => ({ ...h.profile, taxRegion: "SCOTLAND" }) }),
        ),
        () => new Date("2027-05-10T12:00:00Z"),
      );
      expect(
        await screen.findByText(
          "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
        ),
      ).toBeOnTheScreen();
      expect(screen.queryByText("£0")).toBeNull();
    });

    it("pull to refresh reads the budget and the check-in's reads again", async () => {
      const api = fakeApi(routes(renterHousehold()));
      await budget(api);
      await screen.findByLabelText(HERO);
      const before = api.calls.filter((c) => c.path === "/budget-entries").length;
      await act(async () => {
        await refreshControl()?.onRefresh();
      });
      expect(api.calls.filter((c) => c.path === "/budget-entries").length).toBe(before + 1);
      expect(api.calls.filter((c) => c.path === "/accounts").length).toBeGreaterThan(1);
    });
  });

  describe("the what-if zone", () => {
    it("starts closed with its summary; no input sends a request or changes a saved figure", async () => {
      const api = fakeApi(routes(renterHousehold()));
      await budget(api);
      await screen.findByLabelText(HERO);
      expect(screen.getByText("Illustration, not saved")).toBeOnTheScreen();
      expect(screen.queryByTestId("runway-lump")).toBeNull();
      const sent = api.calls.length;
      const u = user();
      await u.press(
        screen.getByRole("button", { name: "Show what-if: redundancy pay, a spending cut" }),
      );
      const before = screen.getByTestId("runway-outcome").props.children;
      // Nothing changed: no Reset.
      expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
      await u.type(screen.getByLabelText("Redundancy pay or lump sum"), "5000");
      await u.type(screen.getByLabelText("Spending you would cut each month"), "200");
      await u.press(
        screen.getByRole("button", { name: "Accounts and income in this illustration" }),
      );
      await u.press(screen.getByRole("switch", { name: "Current account" }));
      await settle();
      // The illustration moved; nothing was sent and the saved figures stand.
      expect(screen.getByTestId("runway-outcome").props.children).not.toBe(before);
      expect(api.calls.length).toBe(sent);
      expect(screen.getByLabelText(HERO)).toBeOnTheScreen();
      expect(screen.getByLabelText("Money in each month, £2,085, After tax")).toBeOnTheScreen();
      // Reset shows once something differs, and puts everything back.
      await u.press(screen.getByRole("button", { name: "Reset to saved figures" }));
      expect(screen.getByTestId("runway-outcome").props.children).toBe(before);
      expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
      expect(api.calls.length).toBe(sent);
    });
  });

  describe("the editing core", () => {
    it("edits an own entry: PATCH with If-Match, web's fields only, Saved, the figures follow", async () => {
      const h = renterHousehold();
      const rent = h.budgetEntries.find((r) => r.name === "Rent");
      if (!rent) throw new Error("no rent");
      const patch = jest.fn((body: unknown) => ({
        ...rent,
        ...(body as object),
        updatedAt: "2026-11-21T09:00:00.000Z",
      }));
      const api = fakeApi(routes(h, { [`PATCH /budget-entries/${rent.id}`]: patch }));
      await budget(api);
      await screen.findByLabelText(HERO);
      await openEntry(/^Rent, £950 a month/);
      const amount = screen.getByLabelText("Amount");
      const u = user();
      await u.clear(amount);
      await u.type(amount, "1000");
      await u.press(screen.getByRole("button", { name: "Save" }));
      await settle();
      const call = api.calls.find((c) => c.method === "PATCH");
      expect(call?.path).toBe(`/budget-entries/${rent.id}`);
      expect(call?.ifMatch).toBe(etagFor(rent.updatedAt));
      expect(call?.body).toEqual({
        name: "Rent",
        amount: 1000,
        frequency: "monthly",
        category: "housing",
        isEssential: true,
      });
      for (const key of ["isPrimaryIncome", "isDefault", "contractEndDate"]) {
        expect(call?.body).not.toHaveProperty(key);
      }
      expect(screen.getByText("Saved")).toBeOnTheScreen();
      expect(screen.queryByTestId("budget-entry-sheet")).toBeNull();
      // The cached list holds the answer: 2,085 - (1,960 + 50) = 75 left over.
      expect(screen.getByLabelText(/^Left over each month, £75, /)).toBeOnTheScreen();
    });

    it("an income entry saved under bills stays income when moved to another spending category", async () => {
      const h = renterHousehold([
        ...RENTER_BUDGET,
        { name: "Side work", category: "bills", amount: 200, isIncome: true, isEssential: true },
      ]);
      const side = h.budgetEntries.find((r) => r.name === "Side work");
      if (!side) throw new Error("no row");
      const api = fakeApi(
        routes(h, {
          [`PATCH /budget-entries/${side.id}`]: (body) => ({ ...side, ...(body as object) }),
        }),
      );
      await budget(api);
      await screen.findByTestId("budget-hero");
      await openEntry(/^Side work, /);
      const u = user();
      await u.press(screen.getByRole("radio", { name: "Expenses" }));
      await u.press(screen.getByRole("button", { name: "Save" }));
      await settle();
      const call = api.calls.find((c) => c.method === "PATCH");
      // Not moved into or out of income: what the entry is stays as saved, so no isIncome is sent.
      expect(call?.body).toEqual({
        name: "Side work",
        amount: 200,
        frequency: "monthly",
        category: "expenses",
        isEssential: true,
      });
    });

    it("an entry moved out of income becomes spending", async () => {
      const h = renterHousehold([
        { name: "Salary after tax", category: "income", amount: 2085, isIncome: true },
        { name: "Gift", category: "income", amount: 50, isIncome: true },
      ]);
      const gift = h.budgetEntries.find((r) => r.name === "Gift");
      if (!gift) throw new Error("no row");
      const api = fakeApi(
        routes(h, {
          [`PATCH /budget-entries/${gift.id}`]: (body) => ({ ...gift, ...(body as object) }),
        }),
      );
      await budget(api);
      await screen.findByTestId("budget-hero");
      await openEntry(/^Gift, /);
      const u = user();
      await u.press(screen.getByRole("radio", { name: "Expenses" }));
      await u.press(screen.getByRole("button", { name: "Save" }));
      await settle();
      const call = api.calls.find((c) => c.method === "PATCH");
      expect(call?.body).toMatchObject({ category: "expenses", isIncome: false });
    });

    it("a 412 keeps the sheet and what was typed, says so in web's words, and reads the list again", async () => {
      const h = renterHousehold();
      const rent = h.budgetEntries.find((r) => r.name === "Rent");
      if (!rent) throw new Error("no rent");
      const api = fakeApi(
        routes(h, { [`PATCH /budget-entries/${rent.id}`]: () => fail("client", 412) }),
      );
      await budget(api);
      await screen.findByLabelText(HERO);
      const reads = () =>
        api.calls.filter((c) => c.path === "/budget-entries" && c.method === "GET");
      const before = reads().length;
      await openEntry(/^Rent, £950 a month/);
      await user().press(screen.getByRole("button", { name: "Save" }));
      await settle();
      expect(
        screen.getByText(
          "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.",
        ),
      ).toBeOnTheScreen();
      expect(screen.getByTestId("budget-entry-sheet")).toBeOnTheScreen();
      expect(reads().length).toBe(before + 1);
      expect(screen.queryByText("Saved")).toBeNull();
    });

    it("a failed save changes nothing and says so", async () => {
      const h = renterHousehold();
      const rent = h.budgetEntries.find((r) => r.name === "Rent");
      if (!rent) throw new Error("no rent");
      await budget(
        fakeApi(routes(h, { [`PATCH /budget-entries/${rent.id}`]: () => fail("server", 500) })),
      );
      await screen.findByLabelText(HERO);
      await openEntry(/^Rent, £950 a month/);
      await user().press(screen.getByRole("button", { name: "Save" }));
      await settle();
      expect(
        screen.getByText("We could not save your changes. Nothing has changed. Try again."),
      ).toBeOnTheScreen();
      await user().press(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByLabelText(HERO)).toBeOnTheScreen();
    });

    it("deletes through the confirmation, in web's words; Entry deleted", async () => {
      const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const h = renterHousehold();
      const eating = h.budgetEntries.find((r) => r.name === "Eating out");
      if (!eating) throw new Error("no row");
      const api = fakeApi(
        routes(h, { [`DELETE /budget-entries/${eating.id}`]: () => ({ success: true }) }),
      );
      await budget(api);
      await screen.findByLabelText(HERO);
      await openEntry(/^Eating out, £90 a month/);
      await user().press(screen.getByRole("button", { name: "Delete entry" }));
      expect(alert).toHaveBeenCalledWith(
        "Delete Eating out?",
        "Eating out, £90 a month, will be deleted from your budget. This cannot be undone.",
        expect.any(Array),
        expect.any(Object),
      );
      expect(api.calls.some((c) => c.method === "DELETE")).toBe(false);
      await confirmAlert(alert, "Delete entry");
      await settle();
      expect(api.calls.filter((c) => c.method === "DELETE").map((c) => c.path)).toEqual([
        `/budget-entries/${eating.id}`,
      ]);
      expect(screen.getByText("Entry deleted")).toBeOnTheScreen();
      // 125 + 90 = 215 left over without it.
      expect(screen.getByLabelText(/^Left over each month, £215, /)).toBeOnTheScreen();
    });

    it("a failed delete keeps the entry and says so", async () => {
      const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const h = renterHousehold();
      const eating = h.budgetEntries.find((r) => r.name === "Eating out");
      if (!eating) throw new Error("no row");
      await budget(
        fakeApi(routes(h, { [`DELETE /budget-entries/${eating.id}`]: () => fail("server", 500) })),
      );
      await screen.findByLabelText(HERO);
      await openEntry(/^Eating out, £90 a month/);
      await user().press(screen.getByRole("button", { name: "Delete entry" }));
      await confirmAlert(alert, "Delete entry");
      await settle();
      expect(
        screen.getByText("We could not delete that entry. Nothing has changed. Try again."),
      ).toBeOnTheScreen();
      expect(screen.queryByText("Entry deleted")).toBeNull();
    });

    it("adds to a category: POST with web's fields only, Saved", async () => {
      const h = renterHousehold();
      const post = jest.fn((body: unknown) => ({
        ...(h.budgetEntries[2] as object),
        ...(body as object),
        id: "6f1c2a8e-0000-4000-8000-000000000001",
      }));
      const api = fakeApi(routes(h, { "POST /budget-entries": post }));
      await budget(api);
      await screen.findByLabelText(HERO);
      const u = user();
      await u.press(screen.getByRole("button", { name: "Edit budget" }));
      await u.press(screen.getByRole("button", { name: "Add to bills" }));
      await u.type(screen.getByLabelText("Name"), "Water");
      await u.type(screen.getByLabelText("Amount"), "25");
      await u.press(screen.getByRole("button", { name: "Save" }));
      await settle();
      expect(post).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledWith({
        category: "bills",
        name: "Water",
        amount: 25,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
        ownership: "sole",
      });
      expect(screen.getByText("Saved")).toBeOnTheScreen();
      // Its own Idempotency-Key, from expo-crypto: the client's default needs a global crypto that
      // Hermes lacks (the device check's add never left the phone). A second add gets a new key.
      const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      const first = api.calls.filter((c) => c.method === "POST")[0]?.idempotencyKey;
      expect(first).toMatch(UUID);
      await u.press(screen.getByRole("button", { name: "Add to bills" }));
      await u.type(screen.getByLabelText("Name"), "Gas");
      await u.type(screen.getByLabelText("Amount"), "40");
      await u.press(screen.getByRole("button", { name: "Save" }));
      await settle();
      const second = api.calls.filter((c) => c.method === "POST")[1]?.idempotencyKey;
      expect(second).toMatch(UUID);
      expect(second).not.toBe(first);
    });

    it("a failed add says so and keeps the form", async () => {
      const h = renterHousehold();
      await budget(fakeApi(routes(h, { "POST /budget-entries": () => fail("server", 500) })));
      await screen.findByLabelText(HERO);
      const u = user();
      await u.press(screen.getByRole("button", { name: "Edit budget" }));
      await u.press(screen.getByRole("button", { name: "Add income" }));
      await u.type(screen.getByLabelText("Name"), "Child Benefit");
      await u.type(screen.getByLabelText("Amount"), "100");
      await u.press(screen.getByRole("button", { name: "Save" }));
      await settle();
      expect(
        screen.getByText("We could not add that entry. Nothing has changed. Try again."),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText("Name").props.value).toBe("Child Benefit");
    });

    it("joint and linked entries are read only, with the website", async () => {
      const base = renterHousehold([
        {
          name: "Take-home pay",
          category: "income",
          amount: 0,
          isIncome: true,
          linkKind: "take_home",
        },
        { name: "Rent", category: "housing", amount: 950, isEssential: true },
        { name: "Shared groceries", category: "expenses", amount: 400, isEssential: true },
      ]);
      const h = { ...base, budgetEntries: withJoint(base.budgetEntries, "Shared groceries") };
      const api = fakeApi(routes(h));
      await budget(api);
      await screen.findByTestId("budget-hero");
      await user().press(screen.getByRole("button", { name: "Edit budget" }));
      const joint = screen.getByRole("link", {
        name: /^Shared groceries, .*Change it on the website$/,
      });
      const linked = screen.getByRole("link", {
        name: /^Take-home pay, .*Change it on the website$/,
      });
      expect(linked).toBeOnTheScreen();
      await user().press(joint);
      expect(Linking.openURL).toHaveBeenCalledWith("https://app.test.invalid/app/budget");
      expect(screen.queryByTestId("budget-entry-sheet")).toBeNull();
      // The own sole row is still editable.
      expect(screen.getByRole("button", { name: /^Rent, £950 a month/ })).toBeOnTheScreen();
      expect(api.calls.some((c) => c.method !== "GET")).toBe(false);
    });

    it("a Breathing room switch saves the entry's Essential flag with If-Match; Saved", async () => {
      const h = renterHousehold();
      const eating = h.budgetEntries.find((r) => r.name === "Eating out");
      if (!eating) throw new Error("no row");
      const api = fakeApi(
        routes(h, {
          [`PATCH /budget-entries/${eating.id}`]: (body) => ({ ...eating, ...(body as object) }),
        }),
      );
      await budget(api);
      await screen.findByLabelText(HERO);
      const u = user();
      await u.press(screen.getByRole("button", { name: "Show what counts" }));
      await u.press(screen.getByRole("switch", { name: "Eating out" }));
      await settle();
      const call = api.calls.find((c) => c.method === "PATCH");
      expect(call).toMatchObject({
        path: `/budget-entries/${eating.id}`,
        body: { isEssential: true },
        ifMatch: etagFor(eating.updatedAt),
      });
      expect(screen.getByText("Saved")).toBeOnTheScreen();
      expect(
        screen.getByRole("switch", { name: "Eating out" }).props.accessibilityState,
      ).toMatchObject({ checked: true });
    });

    it("a joint entry's Breathing room switch is read only and sends nothing", async () => {
      const base = renterHousehold();
      const h = { ...base, budgetEntries: withJoint(base.budgetEntries, "Eating out") };
      const api = fakeApi(routes(h));
      await budget(api);
      await screen.findByTestId("budget-hero");
      const u = user();
      await u.press(screen.getByRole("button", { name: "Show what counts" }));
      const joint = screen.getByRole("switch", { name: "Eating out" });
      expect(joint.props.accessibilityState).toMatchObject({ disabled: true });
      await u.press(joint);
      await settle();
      expect(api.calls.some((c) => c.method !== "GET")).toBe(false);
    });

    it("a failed switch save says so at the top and keeps the saved value", async () => {
      const h = renterHousehold();
      const eating = h.budgetEntries.find((r) => r.name === "Eating out");
      if (!eating) throw new Error("no row");
      await budget(
        fakeApi(routes(h, { [`PATCH /budget-entries/${eating.id}`]: () => fail("server", 500) })),
      );
      await screen.findByLabelText(HERO);
      const u = user();
      await u.press(screen.getByRole("button", { name: "Show what counts" }));
      await u.press(screen.getByRole("switch", { name: "Eating out" }));
      await settle();
      expect(
        screen.getByText("We could not save your changes. Nothing has changed. Try again."),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("switch", { name: "Eating out" }).props.accessibilityState,
      ).toMatchObject({ checked: false });
    });
  });

  it("View your savings accounts opens the Accounts tab", async () => {
    const { onOpenAccounts } = await budget(fakeApi(routes(renterHousehold())));
    await screen.findByLabelText(HERO);
    await user().press(screen.getByRole("link", { name: "View your savings accounts" }));
    expect(onOpenAccounts).toHaveBeenCalledTimes(1);
  });

  it("a household with no profile facts still shows the budget's own figures", async () => {
    // The canned household: no salary, no housing details; the renter's typed rows.
    const h = household(undefined, undefined, [
      { name: "Salary after tax", category: "income", amount: 2085, isIncome: true },
      { name: "Rent", category: "housing", amount: 950, isEssential: true },
    ]);
    await budget(fakeApi(routes(h)));
    // 2,085 - 950 = 1,135.
    expect(await screen.findByLabelText(/^Left over each month, £1,135, /)).toBeOnTheScreen();
    expect(RENTER_FACTS.monthlyTakeHome).toBe(2085);
  });
});
