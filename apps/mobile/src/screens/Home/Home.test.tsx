import { light } from "@flump/tokens/native";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Linking, StyleSheet, type TextStyle } from "react-native";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import {
  type BudgetSeed,
  household,
  MONTH,
  NOW,
  routes,
} from "../../features/check-in/checkInTestData";
import { refreshControl } from "../../testing/refresh";
import { Home, type HomeWebLinks } from "./Home";

/** The website's pages (placeholder addresses). */
const LINKS: HomeWebLinks = {
  setUp: { url: "https://app.test.invalid/app/onboarding", exact: true },
  addAccount: { url: "https://app.test.invalid/app/accounts", exact: true },
  changeWhatCounts: {
    url: "https://app.test.invalid/app/profile?tab=profile#net-worth",
    exact: true,
  },
  addEstimate: { url: "https://app.test.invalid/app/accounts?add=property", exact: true },
  addBudget: { url: "https://app.test.invalid/app/budget", exact: true },
  addSpending: { url: "https://app.test.invalid/app/budget", exact: true },
};

/** Today 2026-11 (NOW): two accounts recorded in September, October and November. */
const RISING = [
  { name: "Current account", type: "Current", balance: 2100, sep: 1800, oct: 1900, nov: 2100 },
  {
    name: "Easy access savings",
    type: "Saving",
    balance: 50000,
    sep: 49000,
    oct: 49880,
    nov: 50000,
  },
] as const;

async function home(
  api: ReturnType<typeof fakeApi>,
  links: HomeWebLinks = LINKS,
  now: () => Date = NOW,
) {
  const onSignOut = jest.fn();
  const onOpenCheckIn = jest.fn();
  const onOpenHistory = jest.fn();
  const { ui } = withApi(
    <Home
      onSignOut={onSignOut}
      onOpenCheckIn={onOpenCheckIn}
      onOpenHistory={onOpenHistory}
      marketingOrigin="https://m.test.invalid"
      links={links}
      now={now}
    />,
    api.client,
  );
  await render(ui);
  return { onSignOut, onOpenCheckIn, onOpenHistory };
}

/** Lets every read answer and the screen hear of it, inside act. */
const settle = () => act(async () => jest.advanceTimersByTimeAsync(0));

const textColour = (words: string) =>
  (StyleSheet.flatten(screen.getByText(words).props.style) as TextStyle).color;

describe("Home", () => {
  // On Jest's clock a press's 130 ms hold costs nothing, and a read that answers after the last
  // assertion is never delivered to Home outside act: its 0 ms notify timer is dropped with the
  // fake clock. A test that needs the reads waits for them.
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("the hero is the heading now; Sign out is in the More list, not here (S4)", async () => {
    const { onSignOut } = await home(fakeApi(routes(household())));
    expect(await screen.findByTestId("home-hero")).toBeOnTheScreen();
    expect(screen.queryByText("You are signed in")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Device check" })).toBeNull();
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("shows net worth, the change since last month and the bars, read out as one item", async () => {
    await home(fakeApi(routes(household(RISING))));
    // 2,100 + 50,000 today; 1,900 + 49,880 in October.
    expect(await screen.findByText("£52,100")).toBeOnTheScreen();
    expect(screen.getByText("Net worth")).toBeOnTheScreen();
    expect(screen.getByText("£320 since October")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Net worth, £52,100, up £320 since October").props.accessible,
    ).toBe(true);
    // Three recorded months: September, October and November, the latest solid.
    expect(screen.getByTestId("net-worth-trend").props.accessibilityLabel).toBe(
      "Net worth at your last 3 monthly check-ins, oldest first. September 2026: £50,800. October 2026: £51,780. November 2026, the latest: £52,100.",
    );
    // Nothing is left out under the default choices with these accounts.
    expect(screen.queryByTestId("net-worth-basis-line")).toBeNull();
  });

  it("a fall reads like a rise and keeps the ordinary text colour; a negative figure too", async () => {
    // The fixture household: £112,746 owed more than held, the same as October.
    await home(
      fakeApi(
        routes(
          household([
            { name: "Mortgage", type: "Mortgage", balance: -185000, oct: -184500, sep: -185400 },
            { name: "Current account", type: "Current", balance: 1204, oct: 1204 },
          ]),
        ),
      ),
    );
    expect(await screen.findByText("-£183,796")).toBeOnTheScreen();
    expect(screen.getByText("£500 since October")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Net worth, minus £183,796, down £500 since October"),
    ).toBeOnTheScreen();
    expect(textColour("-£183,796")).toBe(light.colors["text.primary"]);
    expect(textColour("£500 since October")).toBe(light.colors["text.primary"]);
  });

  it("the same as last month says so, with no figure", async () => {
    await home(fakeApi(routes(household())));
    expect(await screen.findByText("Same as October")).toBeOnTheScreen();
    expect(screen.getByLabelText("Net worth, minus £112,746, same as October")).toBeOnTheScreen();
  });

  it("no change line when no earlier month is recorded, and no bars below three months", async () => {
    await home(
      fakeApi(routes(household([{ name: "Current account", type: "Current", balance: 900 }]))),
    );
    expect(await screen.findByText("£900")).toBeOnTheScreen();
    expect(screen.getByLabelText("Net worth, £900")).toBeOnTheScreen();
    expect(screen.queryByTestId("home-hero-change")).toBeNull();
    expect(screen.queryByTestId("net-worth-trend")).toBeNull();
  });

  it("student loan not counted: left out of the figure, and the line says so and links to settings", async () => {
    // The fixture profile counts property and not the student loan.
    await home(
      fakeApi(
        routes(
          household([
            { name: "Current account", type: "Current", balance: 3000, oct: 2800 },
            { name: "Student loan", type: "Student Loan", balance: -38500, oct: -38620 },
          ]),
        ),
      ),
    );
    expect(await screen.findByText("£3,000")).toBeOnTheScreen();
    expect(screen.getByText("£200 since October")).toBeOnTheScreen();
    expect(screen.getByText("Not counting your student loan.")).toBeOnTheScreen();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: "Change what counts on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.changeWhatCounts.url);
  });

  it("property not counted: the home and its mortgage are left out, figure and change alike", async () => {
    const h = household([
      { name: "Home", type: "Property", balance: 310000, oct: 309500 },
      { name: "Mortgage", type: "Mortgage", balance: -186000, oct: -186550 },
      { name: "Current account", type: "Current", balance: 3400, oct: 3360 },
    ]);
    await home(
      fakeApi(
        routes(h, {
          "GET /user-profile": () => ({ ...h.profile, netWorthCountsProperty: false }),
        }),
      ),
    );
    expect(await screen.findByText("£3,400")).toBeOnTheScreen();
    expect(screen.getByText("£40 since October")).toBeOnTheScreen();
    expect(screen.getByText("Not counting your property or mortgage.")).toBeOnTheScreen();
    expect(screen.getByText("Net worth")).toBeOnTheScreen();
  });

  it("a counted home estimate is named in the label", async () => {
    await home(
      fakeApi(
        routes(
          household([
            { name: "Home (your estimate)", type: "Property", balance: 250000 },
            { name: "Current account", type: "Current", balance: 1000 },
          ]),
        ),
      ),
    );
    expect(await screen.findByText("Net worth, including your home estimate")).toBeOnTheScreen();
    expect(screen.getByText("£251,000")).toBeOnTheScreen();
  });

  it("a home estimate that is not counted leaves the plain label", async () => {
    const h = household([
      { name: "Home (your estimate)", type: "Property", balance: 250000 },
      { name: "Current account", type: "Current", balance: 1000 },
    ]);
    await home(
      fakeApi(
        routes(h, { "GET /user-profile": () => ({ ...h.profile, netWorthCountsProperty: false }) }),
      ),
    );
    expect(await screen.findByText("£1,000")).toBeOnTheScreen();
    expect(screen.getByText("Net worth")).toBeOnTheScreen();
    expect(screen.queryByText("Net worth, including your home estimate")).toBeNull();
  });

  it("no accounts: the prompt and a way to add one on the website, never £0", async () => {
    await home(fakeApi(routes(household([]))));
    expect(await screen.findByText("Add an account to see your net worth.")).toBeOnTheScreen();
    expect(screen.getByText("Not set")).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: "Add an account on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.addAccount.url);
    // The check-in row keeps its S3 state.
    expect(screen.getByTestId("check-in-row")).toBeOnTheScreen();
  });

  it("with no web app address, the links say they open the Flump website", async () => {
    const site = { url: "https://m.test.invalid", exact: false };
    await home(fakeApi(routes(household([]))), {
      setUp: site,
      addAccount: site,
      changeWhatCounts: site,
      addEstimate: site,
      addBudget: site,
      addSpending: site,
    });
    // The hero's link first; the strip's prompt has the same words (S5b).
    const both = await screen.findAllByRole("link", { name: "Open the Flump website" });
    expect(both).toHaveLength(2);
    const [heroLink] = both;
    if (!heroLink) throw new Error("expected the hero's link");
    await userEvent.setup().press(heroLink);
    expect(Linking.openURL).toHaveBeenCalledWith("https://m.test.invalid");
  });

  it("loading: nothing for 200 ms, then blocks that stay 400 ms, then the hero", async () => {
    let answer: (value: unknown) => void = () => {};
    const h = household(RISING);
    await home(
      fakeApi(
        routes(h, {
          "GET /accounts": () =>
            new Promise((resolve) => {
              answer = resolve;
            }),
        }),
      ),
    );
    await act(async () => jest.advanceTimersByTimeAsync(199));
    expect(screen.queryByTestId("home-hero-loading")).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(screen.getByLabelText("Loading your net worth")).toBeOnTheScreen();
    // Room for the trend bars too, so the hero that arrives takes the same frame.
    expect(
      StyleSheet.flatten(
        screen.getByTestId("home-hero-loading-skeleton-slot", { includeHiddenElements: true }).props
          .style,
      ).height,
    ).toBe(56);
    // The answer comes 50 ms later; the blocks stay until 400 ms after they showed.
    await act(async () => {
      answer(h.accounts);
      await jest.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByTestId("home-hero-loading")).toBeOnTheScreen();
    expect(screen.queryByTestId("home-hero")).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(349));
    expect(screen.getByTestId("home-hero-loading")).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(screen.queryByTestId("home-hero-loading")).toBeNull();
    expect(screen.getByText("£52,100")).toBeOnTheScreen();
  });

  it("a quick answer never shows the blocks", async () => {
    await home(fakeApi(routes(household(RISING))));
    await settle();
    expect(screen.getByTestId("home-hero")).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTimeAsync(1000));
    expect(screen.queryByTestId("home-hero-loading")).toBeNull();
  });

  it("out of step: the out-of-step words with Try again, never the connection, never £0", async () => {
    const h = household(RISING);
    // An account with no balance: the one thing Home cannot do without.
    const { balance: _left, ...noBalance } = h.accounts[0] as (typeof h.accounts)[number];
    await home(fakeApi(routes(h, { "GET /accounts": () => [noBalance, ...h.accounts.slice(1)] })));
    expect(
      await screen.findByText(
        "This version of the app did not understand Flump's answer. Try again later, or update the app if an update is available.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/connection/)).toBeNull();
    expect(screen.queryByText(/Add an account/)).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.getByTestId("home-retry")).toBeOnTheScreen();
  });

  it("unavailable after the retries: could not load, with Try again that reads again", async () => {
    let down = true;
    const h = household(RISING);
    const api = fakeApi(
      routes(h, {
        "GET /accounts": () => (down ? fail("unavailable", 503) : h.accounts),
      }),
    );
    await home(api);
    // Two retries, about a second and two seconds apart, then the failure shows.
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(screen.getByText("We could not load your accounts")).toBeOnTheScreen();
    expect(screen.getByText("Check your connection and try again.")).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
    expect(api.calls.filter((c) => c.path === "/accounts")).toHaveLength(3);
    down = false;
    await userEvent.setup().press(screen.getByTestId("home-retry"));
    await settle();
    expect(screen.getByText("£52,100")).toBeOnTheScreen();
  });

  it("an older backend (fields missing) and a newer one (fields added) still show the hero", async () => {
    const h = household(RISING);
    const older = h.accounts.map(
      ({ accountSubtype: _a, creditLimit: _c, isCurrent: _i, ...a }) => a,
    );
    const newer = h.details.map((d) => ({ ...d, fieldFromALaterBackend: "something new" }));
    await home(
      fakeApi(
        routes(h, {
          "GET /accounts": () => older,
          "GET /account-details": () => newer,
          "GET /snapshots/check-ins": () => ({ latestCompletedMonth: "2026-10", extra: 1 }),
        }),
      ),
    );
    expect(await screen.findByText("£52,100")).toBeOnTheScreen();
    expect(screen.getByText("£320 since October")).toBeOnTheScreen();
  });

  it("shows the check-in row when the month is due, and opens the check-in", async () => {
    const { onOpenCheckIn } = await home(fakeApi(routes(household())));
    expect(await screen.findByText("Last check-in: October 2026")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Start monthly check-in" }));
    expect(onOpenCheckIn).toHaveBeenCalledTimes(1);
  });

  it("no row once this month is checked in, and one request per read", async () => {
    const h = household(undefined, { latestCompletedMonth: MONTH, latestStartedMonth: MONTH });
    const api = fakeApi(routes(h));
    await home(api);
    await screen.findByTestId("home-hero");
    await settle();
    // The check-in's four reads and the budget.
    expect(api.request).toHaveBeenCalledTimes(5);
    expect(screen.queryByTestId("check-in-row")).toBeNull();
  });

  it("terms not agreed mid-session: the terms screen instead of a home without a way on", async () => {
    const api = fakeApi({
      ...routes(household()),
      "GET /accounts": () => fail("forbidden", 403, "terms_not_accepted"),
    });
    const { onSignOut } = await home(api);
    expect(
      await screen.findByRole("header", { name: "Please agree to our terms on the website" }),
    ).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("no profile yet: the way to set up on the website, not a hero or a check-in row", async () => {
    await home(fakeApi({ ...routes(household()), "GET /user-profile": () => undefined }));
    expect(
      await screen.findByRole("header", { name: "Finish setting up Flump on the website" }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("check-in-row")).toBeNull();
    expect(screen.queryByTestId("home-hero")).toBeNull();
    expect(screen.queryByText("Add an account to see your net worth.")).toBeNull();
  });

  it("when the reads fail, the row still offers the check-in under the failure", async () => {
    const api = fakeApi({
      ...routes(household()),
      "GET /snapshots/check-ins": () => fail("forbidden", 403),
    });
    await home(api);
    expect(await screen.findByText("Record your November balances")).toBeOnTheScreen();
    expect(screen.getByTestId("home-error")).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("the bars and the link under them open net worth history; the link is what is read", async () => {
    const { onOpenHistory } = await home(fakeApi(routes(household(RISING))));
    const link = await screen.findByRole("link", { name: "See how it has changed" });
    const user = userEvent.setup();
    await user.press(link);
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
    // The bars' touch is not a stop of its own: no second control with that name.
    expect(screen.getAllByRole("link", { name: "See how it has changed" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "See how it has changed" })).toBeNull();
    const bars = screen.getByTestId("home-trend-open-history");
    expect(bars.props.accessible).toBe(false);
    await user.press(bars);
    expect(onOpenHistory).toHaveBeenCalledTimes(2);
  });

  it("no bars below three months, and no history link beside nothing", async () => {
    await home(
      fakeApi(routes(household([{ name: "Current account", type: "Current", balance: 900 }]))),
    );
    expect(await screen.findByText("£900")).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: "See how it has changed" })).toBeNull();
  });

  describe("pull to refresh", () => {
    it("reads all four again and keeps the figures on screen, with no blocks", async () => {
      let answer: (value: unknown) => void = () => {};
      let slow = false;
      const h = household(RISING);
      const api = fakeApi(
        routes(h, {
          "GET /accounts": () =>
            slow
              ? new Promise((resolve) => {
                  answer = resolve;
                })
              : h.accounts,
        }),
      );
      await home(api);
      expect(await screen.findByText("£52,100")).toBeOnTheScreen();
      await settle();
      expect(api.request).toHaveBeenCalledTimes(4);
      slow = true;
      await act(async () => {
        void refreshControl()?.onRefresh();
      });
      expect(api.request).toHaveBeenCalledTimes(8);
      expect(refreshControl()?.refreshing).toBe(true);
      // Long after the skeleton's 200 ms the figures are still there, and no blocks.
      await act(async () => jest.advanceTimersByTimeAsync(1000));
      expect(screen.getByText("£52,100")).toBeOnTheScreen();
      expect(screen.queryByTestId("home-hero-loading")).toBeNull();
      await act(async () => {
        answer(h.accounts);
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(refreshControl()?.refreshing).toBe(false);
      expect(screen.getByText("£52,100")).toBeOnTheScreen();
    });

    it("a failed refresh keeps the figures and shows no failure over them", async () => {
      let down = false;
      const h = household(RISING);
      const api = fakeApi(
        routes(h, { "GET /accounts": () => (down ? fail("unavailable", 503) : h.accounts) }),
      );
      await home(api);
      expect(await screen.findByText("£52,100")).toBeOnTheScreen();
      down = true;
      await act(async () => {
        void refreshControl()?.onRefresh();
      });
      // The refresh and its two retries fail.
      await act(async () => jest.advanceTimersByTimeAsync(10_000));
      expect(refreshControl()?.refreshing).toBe(false);
      expect(screen.getByText("£52,100")).toBeOnTheScreen();
      expect(screen.queryByTestId("home-error")).toBeNull();
    });
  });
});

/**
 * The renting household of apps/e2e/support/personas.ts: a current account, savings, a pension, a
 * credit card and a Plan 2 student loan (debts stored negative).
 */
const RENTER = [
  { name: "Current account", type: "Current", balance: 1300, oct: 1280 },
  { name: "Easy access savings", type: "Saving", balance: 3200, oct: 3050 },
  { name: "Workplace pension", type: "Pension", balance: 9000, oct: 8740 },
  { name: "Credit card", type: "Credit Card", balance: -1800, oct: -1835 },
  { name: "Student loan", type: "Student Loan", balance: -38500, oct: -38380 },
] as const;
const NO_DEBT = RENTER.slice(0, 3);

/** personas.ts's renter budget, none of it linked. */
const SALARY: BudgetSeed = {
  name: "Salary after tax",
  category: "income",
  amount: 2085,
  isIncome: true,
};
const SPENDING: readonly BudgetSeed[] = [
  { name: "Rent", category: "housing", amount: 950, isEssential: true },
  { name: "Council tax", category: "bills", amount: 115, isEssential: true },
  { name: "Energy", category: "bills", amount: 80, isEssential: true },
  { name: "Phone and broadband", category: "bills", amount: 40, isEssential: true },
  { name: "Groceries", category: "expenses", amount: 250, isEssential: true },
  { name: "Travel", category: "expenses", amount: 120, isEssential: true },
  { name: "Eating out", category: "expenses", amount: 90 },
  { name: "Subscriptions", category: "expenses", amount: 25 },
  { name: "Everything else", category: "expenses", amount: 80 },
  { name: "Credit card payment", category: "bills", amount: 60, isEssential: true },
  { name: "Easy access savings", category: "savings", amount: 150 },
];
const RENTER_BUDGET = [SALARY, ...SPENDING];
/** The same budget with the income line linked to take-home pay, worked out from the salary. */
const LINKED_BUDGET = [{ ...SALARY, linkKind: "take_home" } as BudgetSeed, ...SPENDING];
/** personas.ts's renter profile facts: what a linked take-home line is worked out from. */
const RENTER_FACTS = {
  employmentType: "employed",
  annualSalary: 32000,
  taxRegion: "ENGLAND",
  studentLoanPlans: ["PLAN_2"],
  pensionPercent: 5,
  isSalarySacrifice: false,
} as const;

/** 10 May 2027, London: the 2027/28 tax year, whose rates are provisional (no Scottish rates). */
const MAY_2027 = () => new Date("2027-05-10T12:00:00Z");
/** 1 June 2028: after the latest tax year in Flump, so 2027/28 rates are used. */
const JUNE_2028 = () => new Date("2028-06-01T12:00:00Z");

const LEFT_OVER_EXPLAINED = "Left over each month, £125, From your budget";

/** The given test ids in the order they are drawn, top to bottom. */
function testIdOrder(ids: readonly string[]): string[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const { props, children } = node as { props?: { testID?: string }; children?: unknown };
    const id = props?.testID;
    if (id && ids.includes(id) && !found.includes(id)) found.push(id);
    walk(children);
  };
  walk(screen.toJSON());
  return found;
}

function withFacts(
  h: ReturnType<typeof household>,
  facts: Record<string, unknown>,
  overrides: Parameters<typeof routes>[1] = {},
) {
  return routes(h, { "GET /user-profile": () => ({ ...h.profile, ...facts }), ...overrides });
}

describe("Home's two-figure strip (S5b)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("the renter: £125 left over and £1,800 owed, under the hero and above the check-in row", async () => {
    await home(fakeApi(routes(household(RENTER, undefined, RENTER_BUDGET))));
    // Income 2,085. Essentials 950 + 115 + 80 + 40 + 250 + 120 + 60 = 1,615; other spending
    // 90 + 25 + 80 = 195; savings 150. Left over 2,085 - 1,615 - 195 - 150 = 125.
    expect(await screen.findByLabelText(LEFT_OVER_EXPLAINED)).toBeOnTheScreen();
    // Owed: the credit card's 1,800. The student loan is not consumer debt, and with debt the
    // pension pots are not shown.
    expect(
      screen.getByLabelText("What you owe, £1,800, Cards, loans and overdrafts"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Pension pots")).toBeNull();
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
    // Under the hero and above the check-in row, in that order.
    const order = testIdOrder(["home-hero", "kpi-strip", "check-in-row"]);
    expect(order).toEqual(["home-hero", "kpi-strip", "check-in-row"]);
  });

  it("short: the label says so and the figure keeps the ordinary text colour", async () => {
    await home(
      fakeApi(
        routes(
          household(NO_DEBT, undefined, [
            { name: "Pay", category: "income", amount: 1000, isIncome: true },
            { name: "Rent", category: "housing", amount: 1200, isEssential: true },
          ]),
        ),
      ),
    );
    // 1,000 - 1,200 = -200.
    expect(await screen.findByText("Short each month")).toBeOnTheScreen();
    expect(screen.getByText("-£200")).toBeOnTheScreen();
    expect(textColour("-£200")).toBe(light.colors["text.primary"]);
    expect(screen.queryByText("Left over each month")).toBeNull();
  });

  it("income only: the income and a link to add spending on the website", async () => {
    await home(fakeApi(routes(household(NO_DEBT, undefined, [SALARY]))));
    expect(await screen.findByLabelText("Income in your budget, £2,085")).toBeOnTheScreen();
    await userEvent.setup().press(
      screen.getByRole("link", {
        name: "Add your spending on the website to see what is left over each month",
      }),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.addSpending.url);
    // No debt: 9,000 in the one pension.
    expect(screen.getByLabelText("Pension pots, £9,000, From your accounts")).toBeOnTheScreen();
  });

  it("no budget: one prompt in place of the strip, which hides what is owed too", async () => {
    await home(fakeApi(routes(household(RENTER))));
    expect(
      await screen.findByText("Add your budget to see what is left over each month"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("What you owe")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: "Add your budget on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.addBudget.url);
  });

  it("spending and no income row: the prompt, never minus the spending as left over", async () => {
    await home(fakeApi(routes(household(RENTER, undefined, SPENDING))));
    expect(await screen.findByTestId("kpi-strip-prompt")).toBeOnTheScreen();
    expect(screen.queryByText("Left over each month")).toBeNull();
    expect(screen.queryByText("-£1,960")).toBeNull();
  });

  it("pension and no debt: the pension pots in the second card", async () => {
    await home(fakeApi(routes(household(NO_DEBT, undefined, RENTER_BUDGET))));
    expect(await screen.findByLabelText(LEFT_OVER_EXPLAINED)).toBeOnTheScreen();
    expect(screen.getByLabelText("Pension pots, £9,000, From your accounts")).toBeOnTheScreen();
    expect(screen.queryByText("What you owe")).toBeNull();
  });

  it("neither debt nor pension: the one figure", async () => {
    await home(fakeApi(routes(household(RENTER.slice(0, 2), undefined, RENTER_BUDGET))));
    expect(await screen.findByLabelText(LEFT_OVER_EXPLAINED)).toBeOnTheScreen();
    expect(screen.queryByTestId("kpi-strip-second")).toBeNull();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("a linked take-home: worked out from the salary, with no rates notice in a confirmed year", async () => {
    const h = household(RENTER, undefined, LINKED_BUDGET);
    await home(fakeApi(withFacts(h, RENTER_FACTS)));
    // 2026/27, salary 32,000: pension 5% = 1,600 (net pay). Tax (32,000 - 1,600 - 12,570) x 20%
    // = 3,566. NI (32,000 - 12,570) x 8% = 1,554.40. Plan 2 (32,000 - 29,385) x 9% = 235.35.
    // Take-home 32,000 - 1,600 - 3,566 - 1,554.40 - 235.35 = 25,044.25 a year, 2,087 a month.
    // Left over 2,087 - 1,615 - 195 - 150 = 127.
    expect(
      await screen.findByLabelText("Left over each month, £127, From your budget"),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
  });

  it("provisional rates: the notice above the strip when the budget counts a worked-out take-home", async () => {
    const h = household(RENTER, undefined, LINKED_BUDGET);
    await home(fakeApi(withFacts(h, RENTER_FACTS)), LINKS, MAY_2027);
    expect(
      await screen.findByText(
        "2027/28 rates are provisional: announced but not yet confirmed. Figures may change.",
      ),
    ).toBeOnTheScreen();
    // Above the hero, where web's dashboard puts TaxRatesStatusBanner.
    const order = testIdOrder(["tax-rates-status-banner", "home-hero", "kpi-strip"]);
    expect(order).toEqual(["tax-rates-status-banner", "home-hero", "kpi-strip"]);
  });

  it("after the latest year in Flump: the year whose rates are used", async () => {
    const h = household(RENTER, undefined, LINKED_BUDGET);
    await home(fakeApi(withFacts(h, RENTER_FACTS)), LINKS, JUNE_2028);
    expect(
      await screen.findByText(
        "Using 2027/28 rates. The 2028/29 rates are not in Flump yet, so figures may be out of date.",
      ),
    ).toBeOnTheScreen();
  });

  it("a typed income in a provisional year: no rates notice, since no rates are used", async () => {
    await home(
      fakeApi(withFacts(household(RENTER, undefined, RENTER_BUDGET), RENTER_FACTS)),
      LINKS,
      MAY_2027,
    );
    expect(await screen.findByLabelText(LEFT_OVER_EXPLAINED)).toBeOnTheScreen();
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
  });

  it("refused: no Scottish rates for the year, so the notice in place of the figure", async () => {
    const h = household(RENTER, undefined, LINKED_BUDGET);
    await home(fakeApi(withFacts(h, { ...RENTER_FACTS, taxRegion: "SCOTLAND" })), LINKS, MAY_2027);
    const notice =
      "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.";
    expect(await screen.findByText(notice)).toBeOnTheScreen();
    expect(screen.getByLabelText(`Left over each month, ${notice}`)).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.queryByTestId("kpi-strip-prompt")).toBeNull();
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
    expect(screen.getByText("What you owe")).toBeOnTheScreen();
  });

  it("a student loan plan with no threshold for the year: the figure stands and says what it leaves out", async () => {
    const h = household(RENTER, undefined, LINKED_BUDGET);
    await home(
      fakeApi(withFacts(h, { ...RENTER_FACTS, studentLoanPlans: ["PLAN_1"] })),
      LINKS,
      MAY_2027,
    );
    // 2027/28, Plan 1 left out: pension 1,600; tax 3,566; NI 1,554.40 (the 2027/28 allowance and
    // rates are 2026/27's). Take-home 32,000 - 1,600 - 3,566 - 1,554.40 = 25,279.60 a year,
    // 2,107 a month. Left over 2,107 - 1,960 = 147.
    const leavesOut =
      "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.";
    expect(
      await screen.findByLabelText(`Left over each month, £147, ${leavesOut}`),
    ).toBeOnTheScreen();
    expect(screen.queryByText("From your budget")).toBeNull();
  });

  it("a failed budget read is Home's error with Try again, never the budget prompt", async () => {
    let down = true;
    const h = household(RENTER, undefined, RENTER_BUDGET);
    const api = fakeApi(
      routes(h, {
        "GET /budget-entries": () => (down ? fail("unavailable", 503) : h.budgetEntries),
      }),
    );
    await home(api);
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(screen.getByTestId("home-error")).toBeOnTheScreen();
    expect(screen.getByText("Check your connection and try again.")).toBeOnTheScreen();
    expect(screen.queryByTestId("kpi-strip-prompt")).toBeNull();
    expect(screen.queryByTestId("home-hero")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
    // The check-in row keeps working under the failure (S5).
    expect(screen.getByTestId("check-in-row")).toBeOnTheScreen();
    down = false;
    await userEvent.setup().press(screen.getByTestId("home-retry"));
    await settle();
    expect(screen.getByLabelText(LEFT_OVER_EXPLAINED)).toBeOnTheScreen();
  });

  it("a budget row with no amount is out of step, never the connection or the prompt", async () => {
    const h = household(RENTER, undefined, RENTER_BUDGET);
    const [first, ...rest] = h.budgetEntries;
    const { amount: _amount, ...noAmount } = first as (typeof h.budgetEntries)[number];
    await home(fakeApi(routes(h, { "GET /budget-entries": () => [noAmount, ...rest] })));
    expect(
      await screen.findByText(
        "This version of the app did not understand Flump's answer. Try again later, or update the app if an update is available.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/connection/)).toBeNull();
    expect(screen.queryByTestId("kpi-strip-prompt")).toBeNull();
  });

  it("terms not agreed on the budget read: the terms screen", async () => {
    await home(
      fakeApi(
        routes(household(RENTER, undefined, RENTER_BUDGET), {
          "GET /budget-entries": () => fail("forbidden", 403, "terms_not_accepted"),
        }),
      ),
    );
    expect(
      await screen.findByRole("header", { name: "Please agree to our terms on the website" }),
    ).toBeOnTheScreen();
  });

  it("an older backend (no link or share columns) and a newer one (fields added) still show the strip", async () => {
    const h = household(RENTER, undefined, RENTER_BUDGET);
    const older = h.budgetEntries.map(
      ({ ownership: _o, sharePercent: _s, linkKind: _l, linkAccountId: _a, ...row }) => row,
    );
    await home(fakeApi(routes(h, { "GET /budget-entries": () => older })));
    expect(await screen.findByLabelText(LEFT_OVER_EXPLAINED)).toBeOnTheScreen();
    await act(async () => {
      await screen.unmount();
    });
    const newer = h.budgetEntries.map((row) => ({ ...row, fieldFromALaterBackend: "new" }));
    await home(fakeApi(routes(h, { "GET /budget-entries": () => newer })));
    expect(await screen.findByLabelText(LEFT_OVER_EXPLAINED)).toBeOnTheScreen();
  });

  it("loading: the strip's blocks come and go with the hero's, and wait for the budget", async () => {
    let answer: (value: unknown) => void = () => {};
    const h = household(RENTER, undefined, RENTER_BUDGET);
    await home(
      fakeApi(
        routes(h, {
          "GET /budget-entries": () =>
            new Promise((resolve) => {
              answer = resolve;
            }),
        }),
      ),
    );
    // Every other read has answered; Home still waits for the budget.
    await act(async () => jest.advanceTimersByTimeAsync(199));
    expect(screen.queryByTestId("home-hero")).toBeNull();
    expect(screen.queryByTestId("kpi-strip-loading", { includeHiddenElements: true })).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(screen.getByLabelText("Loading your net worth")).toBeOnTheScreen();
    expect(screen.getByTestId("kpi-strip-loading", { includeHiddenElements: true })).toBeTruthy();
    await act(async () => {
      answer(h.budgetEntries);
      await jest.advanceTimersByTimeAsync(50);
    });
    // The blocks stay 400 ms from when they showed, both together.
    expect(screen.getByTestId("home-hero-loading")).toBeOnTheScreen();
    expect(screen.getByTestId("kpi-strip-loading", { includeHiddenElements: true })).toBeTruthy();
    await act(async () => jest.advanceTimersByTimeAsync(349));
    expect(screen.getByTestId("kpi-strip-loading", { includeHiddenElements: true })).toBeTruthy();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(screen.queryByTestId("kpi-strip-loading", { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId("home-hero-loading")).toBeNull();
    expect(screen.getByLabelText(LEFT_OVER_EXPLAINED)).toBeOnTheScreen();
    expect(screen.getByTestId("home-hero")).toBeOnTheScreen();
  });

  it("with no web app address, the strip's link says it opens the Flump website", async () => {
    const site = { url: "https://m.test.invalid", exact: false };
    await home(fakeApi(routes(household(RENTER))), {
      ...LINKS,
      addBudget: site,
      addSpending: site,
    });
    await userEvent
      .setup()
      .press(await screen.findByRole("link", { name: "Open the Flump website" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://m.test.invalid");
  });

  it("a budget row with no frequency is out of step, never read as monthly", async () => {
    const h = household(RENTER, undefined, RENTER_BUDGET);
    const [first, ...rest] = h.budgetEntries;
    const { frequency: _f, ...noFrequency } = first as (typeof h.budgetEntries)[number];
    await home(fakeApi(routes(h, { "GET /budget-entries": () => [noFrequency, ...rest] })));
    expect(await screen.findByTestId("home-error")).toBeOnTheScreen();
    expect(screen.getByText(/did not understand Flump's answer/)).toBeOnTheScreen();
    expect(screen.queryByLabelText(LEFT_OVER_EXPLAINED)).toBeNull();
  });

  it("a profile answer the app does not know (a newer backend) puts only the strip out of step", async () => {
    const h = household(RENTER, undefined, LINKED_BUDGET);
    const api = fakeApi(withFacts(h, { ...RENTER_FACTS, taxRegion: "ATLANTIS" }));
    await home(api);
    // The hero and the check-in row stay: neither reads the region.
    expect(await screen.findByTestId("home-hero")).toBeOnTheScreen();
    expect(screen.getByTestId("check-in-row")).toBeOnTheScreen();
    expect(screen.queryByTestId("home-error")).toBeNull();
    expect(screen.getByTestId("kpi-strip-error")).toBeOnTheScreen();
    expect(screen.getByText(/did not understand Flump's answer/)).toBeOnTheScreen();
    expect(screen.queryByTestId("kpi-strip")).toBeNull();
    expect(screen.queryByTestId("kpi-strip-prompt")).toBeNull();
    const profileReads = () => api.calls.filter((c) => c.path === "/user-profile").length;
    const before = profileReads();
    await userEvent.setup().press(screen.getByTestId("kpi-strip-retry"));
    await settle();
    expect(profileReads()).toBe(before + 1);
  });

  it("when the check-in reads and the budget both fail, one Try again reads both again", async () => {
    let down = true;
    const h = household(RENTER, undefined, RENTER_BUDGET);
    const api = fakeApi(
      routes(h, {
        "GET /accounts": () => (down ? fail("unavailable", 503) : h.accounts),
        "GET /budget-entries": () => (down ? fail("unavailable", 503) : h.budgetEntries),
      }),
    );
    await home(api);
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(screen.getByTestId("home-error")).toBeOnTheScreen();
    down = false;
    await userEvent.setup().press(screen.getByTestId("home-retry"));
    await settle();
    expect(screen.getByTestId("home-hero")).toBeOnTheScreen();
    expect(screen.getByLabelText(LEFT_OVER_EXPLAINED)).toBeOnTheScreen();
  });

  it("not set up wins over a failed budget read: the set-up screen, not an error", async () => {
    const h = household(RENTER);
    await home(
      fakeApi(
        routes(h, {
          "GET /user-profile": () => ({ ...h.profile, onboardingCompleted: false }),
          "GET /budget-entries": () => fail("unavailable", 503),
        }),
      ),
    );
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(
      screen.getByRole("header", { name: "Finish setting up Flump on the website" }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("home-error")).toBeNull();
  });
});
