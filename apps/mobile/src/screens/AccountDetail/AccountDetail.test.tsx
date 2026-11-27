import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { Text } from "../../components/Text";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import { HOMEOWNER, personaHousehold } from "../../features/accounts/accountsTestData";
import { household, NOW, routes } from "../../features/check-in/checkInTestData";
import { refreshControl } from "../../testing/refresh";
import { AccountDetail, type AccountDetailProps } from "./AccountDetail";

const LINKS: AccountDetailProps["links"] = {
  setUp: { url: "https://app.test.invalid/app/onboarding", exact: true },
  mortgage: { url: "https://app.test.invalid/app/mortgage", exact: true },
  debts: { url: "https://app.test.invalid/app/debt", exact: true },
};

/** A build with no web app address: every website link opens the marketing home page. */
const MARKETING = { url: "https://m.test.invalid", exact: false };
const NO_WEB_APP: AccountDetailProps["links"] = {
  setUp: MARKETING,
  mortgage: MARKETING,
  debts: MARKETING,
};

const ON_WEBSITE = "Goals and the estimated return are on the Flump website for now.";

async function detail(api: ReturnType<typeof fakeApi>, id: string, links = LINKS) {
  const props = { onSignOut: jest.fn(), onBackToAccounts: jest.fn(), onEdit: jest.fn() };
  const { ui } = withApi(
    <AccountDetail
      {...props}
      id={id}
      marketingOrigin="https://m.test.invalid"
      links={links}
      header={(title) => <Text testID="header-title">{title}</Text>}
      now={NOW}
    />,
    api.client,
  );
  await render(ui);
  return props;
}

const settle = () => act(async () => jest.advanceTimersByTimeAsync(0));

// The first render in a file loads and transforms React Native's components and the engine, which
// on a cold CI cache took more than the first test's 5 s (as CheckIn, run 45850948864). Rendered
// once here, with its own time, each test's 5 s covers only its own work.
beforeAll(async () => {
  const h = household();
  await detail(fakeApi(routes(h)), h.idOf("Mortgage"));
  await screen.findByTestId("account-detail-hero");
  screen.unmount();
}, 30_000);

describe("AccountDetail", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("the home owner's mortgage: amount owed, dated, its chart summary and every month", async () => {
    const h = personaHousehold(HOMEOWNER);
    await detail(fakeApi(routes(h)), h.idOf("Residential mortgage"));
    // The latest month is October, not this month: "As of October".
    expect(await screen.findByLabelText("Amount owed, £186,000, As of October")).toBeOnTheScreen();
    expect(screen.getByTestId("header-title")).toHaveTextContent("Residential mortgage");
    expect(screen.getByText("This account's balance each month, as recorded.")).toBeOnTheScreen();
    // May 189,300 to November's saved 186,000: down 3,300.
    expect(
      screen.getByTestId("account-chart-summary", { includeHiddenElements: true }),
    ).toHaveTextContent(
      "Down £3,300 since May 2026. The dashed end is this month's saved balance, not yet recorded.",
    );
    // The months sit behind "Show data", closed until pressed.
    expect(screen.queryByTestId("account-months-row-2026-5")).toBeNull();
    expect(screen.getByText("Show data")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId("account-data-toggle"));
    expect(screen.getByText("Hide data")).toBeOnTheScreen();
    expect(screen.getByTestId("account-months-row-2026-5").props.accessibilityLabel).toBe(
      "May 2026, £189,300, Recorded",
    );
    expect(screen.getByTestId("account-months-row-2026-11").props.accessibilityLabel).toBe(
      "November 2026, £186,000, Saved balance",
    );
    // The chart is one image named as web's figure: its title, then its summary.
    expect(screen.getByTestId("account-chart").props.accessibilityLabel).toBe(
      "Residential mortgage balance history. Down £3,300 since May 2026. The dashed end is this month's saved balance, not yet recorded.",
    );
    // Web's end label: the last point's figure.
    expect(
      screen.getByTestId("account-chart-end-label", { includeHiddenElements: true }),
    ).toHaveTextContent("£186,000");
  });

  it("the type under the name, as web's subline: a Barclaycard reads Credit card", async () => {
    const h = household([{ name: "Barclaycard", type: "Credit Card", balance: -1200, nov: -1200 }]);
    await detail(fakeApi(routes(h)), h.idOf("Barclaycard"));
    expect(await screen.findByTestId("account-type")).toHaveTextContent("Credit card");
  });

  it("no type line when the name already says it: a Residential mortgage hides Mortgage", async () => {
    const h = household([
      { name: "Residential mortgage", type: "Mortgage", balance: -186000, nov: -186000 },
    ]);
    await detail(fakeApi(routes(h)), h.idOf("Residential mortgage"));
    expect(await screen.findByTestId("account-detail-hero")).toBeOnTheScreen();
    expect(screen.queryByTestId("account-type")).toBeNull();
  });

  it("the hero agrees with the list row; a saving reads Current balance", async () => {
    const h = personaHousehold(HOMEOWNER);
    await detail(fakeApi(routes(h)), h.idOf("Cash ISA"));
    expect(
      await screen.findByLabelText("Current balance, £10,000, As of October"),
    ).toBeOnTheScreen();
  });

  it("a joint account: the share, then the whole beside it; the history says it is the whole", async () => {
    const h = household([
      {
        name: "Residential mortgage",
        type: "Mortgage",
        balance: -200000,
        oct: -200400,
        nov: -200000,
        ownership: "joint",
        sharePercent: 50,
      },
    ]);
    await detail(fakeApi(routes(h)), h.idOf("Residential mortgage"));
    // Recorded this month, so no date line. Half of 200,000 is 100,000.
    expect(
      await screen.findByLabelText(
        "Amount owed, £100,000, Your 50% share. The whole amount owed is £200,000.",
      ),
    ).toBeOnTheScreen();
    // Shown on screen, but a screen reader hears it once, in the chart's name below.
    expect(
      screen.getByText("The whole amount owed each month, as recorded. Your share is 50% of it.", {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText("The whole amount owed each month, as recorded. Your share is 50% of it."),
    ).toBeNull();
    expect(screen.queryByTestId("account-chart-summary")).toBeNull();
    // October 200,400 to November 200,000.
    expect(
      screen.getByTestId("account-chart-summary", { includeHiddenElements: true }),
    ).toHaveTextContent("Down £400 since October 2026.");
    // The chart's text alternative says it is the whole, as the description does.
    expect(screen.getByTestId("account-chart").props.accessibilityLabel).toBe(
      "Residential mortgage balance history. The whole amount owed each month, as recorded. Your share is 50% of it. Down £400 since October 2026.",
    );
    expect(
      screen.getByTestId("account-chart-end-label", { includeHiddenElements: true }),
    ).toHaveTextContent("£200,000");
  });

  it("a calculated month and a student loan left out say so under the hero", async () => {
    const h = household([
      {
        name: "Student loan",
        type: "Student Loan",
        balance: -38500,
        oct: -38620,
        sources: { 10: "calculated" },
      },
    ]);
    await detail(fakeApi(routes(h)), h.idOf("Student loan"));
    expect(
      await screen.findByLabelText(
        "Amount owed, £38,500, Calculated for October. Not counted in your net worth.",
      ),
    ).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId("account-data-toggle"));
    expect(screen.getByTestId("account-months-row-2026-10").props.accessibilityLabel).toBe(
      "October 2026, £38,620, Calculated",
    );
  });

  it("no months: No balance history yet, and no chart", async () => {
    const h = household([{ name: "Current account", type: "Current", balance: 900 }]);
    await detail(fakeApi(routes(h)), h.idOf("Current account"));
    expect(
      await screen.findByLabelText("Current balance, £900, No monthly balances recorded yet"),
    ).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "No balance history yet" })).toBeOnTheScreen();
    expect(screen.queryByTestId("account-chart", { includeHiddenElements: true })).toBeNull();
  });

  it("one month: no chart yet, web's sentence, and the month", async () => {
    const h = household([{ name: "Current account", type: "Current", balance: 900, nov: 900 }]);
    await detail(fakeApi(routes(h)), h.idOf("Current account"));
    expect(
      await screen.findByText("The chart appears once this account has more monthly balances."),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("account-chart", { includeHiddenElements: true })).toBeNull();
  });

  it("Edit opens the app's edit form (S8)", async () => {
    const h = household();
    const props = await detail(fakeApi(routes(h)), h.idOf("Mortgage"));
    await userEvent.setup().press(await screen.findByRole("button", { name: "Edit" }));
    expect(props.onEdit).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("says what is still on the website for now", async () => {
    const h = household();
    await detail(fakeApi(routes(h)), h.idOf("Mortgage"));
    expect(await screen.findByText(ON_WEBSITE)).toBeOnTheScreen();
    expect(screen.queryByText(/Edit this account on the website/)).toBeNull();
  });

  it("without a web app address, the owner page link says where it really goes", async () => {
    const h = household();
    await detail(fakeApi(routes(h)), h.idOf("Mortgage"), NO_WEB_APP);
    expect(await screen.findByText(ON_WEBSITE)).toBeOnTheScreen();
    expect(screen.queryByText("See your mortgage on the website")).toBeNull();
    const links = screen.getAllByRole("link", { name: "Open the Flump website" });
    // The mortgage's own page only: Edit stays in the app.
    expect(links).toHaveLength(1);
    await userEvent.setup().press(links[0] as never);
    expect(Linking.openURL).toHaveBeenCalledWith(MARKETING.url);
  });

  it("the quick update saves a debt's amount owed as minus it, with If-Match (S8)", async () => {
    const h = household();
    const id = h.idOf("Mortgage");
    const api = fakeApi(routes(h, { [`PATCH /accounts/${id}`]: () => ({ id }) }));
    await detail(api, id);
    const user = userEvent.setup();
    await user.press(await screen.findByRole("button", { name: "Update amount owed" }));
    // By hand: £184,000 owed is stored as -184000.
    await user.clear(screen.getByTestId("quick-balance-value"));
    await user.type(screen.getByTestId("quick-balance-value"), "184000");
    await user.press(screen.getByRole("button", { name: "Save" }));
    await settle();
    const patch = api.calls.find((c) => c.method === "PATCH");
    expect(patch).toEqual({
      method: "PATCH",
      path: `/accounts/${id}`,
      body: { balance: -184000 },
      ifMatch: `"${NOW().toISOString()}"`,
    });
  });

  it("after a refused quick update, the next one sends the version read again", async () => {
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
            version = NEWER;
            fail("client", 412);
          }
          return { id };
        },
      }),
    );
    await detail(api, id);
    const user = userEvent.setup();
    await user.press(await screen.findByRole("button", { name: "Update amount owed" }));
    await user.press(screen.getByRole("button", { name: "Save" }));
    await settle();
    await screen.findByTestId("quick-balance-error");
    await user.press(screen.getByRole("button", { name: "Save" }));
    await settle();
    expect(api.calls.filter((c) => c.method === "PATCH").map((c) => c.ifMatch)).toEqual([
      `"${NOW().toISOString()}"`,
      `"${NEWER}"`,
    ]);
  });

  it("a quick update refused with 412 says it changed somewhere else", async () => {
    const h = household();
    const id = h.idOf("Mortgage");
    await detail(fakeApi(routes(h, { [`PATCH /accounts/${id}`]: () => fail("client", 412) })), id);
    const user = userEvent.setup();
    await user.press(await screen.findByRole("button", { name: "Update amount owed" }));
    await user.press(screen.getByRole("button", { name: "Save" }));
    await settle();
    expect(await screen.findByTestId("quick-balance-error")).toHaveTextContent(
      /changed somewhere else/,
    );
  });

  it("a mortgage links to See your mortgage on the website, as web's owner page link", async () => {
    const h = household();
    await detail(fakeApi(routes(h)), h.idOf("Mortgage"));
    await userEvent
      .setup()
      .press(await screen.findByRole("link", { name: "See your mortgage on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.mortgage.url);
    expect(screen.queryByText("See your debts on the website")).toBeNull();
  });

  it.each([
    ["Barclaycard", "Credit Card", -1200],
    ["Car loan", "Loan", -8400],
    ["Student loan", "Student Loan", -38500],
  ] as const)("%s (%s) links to See your debts on the website", async (name, type, balance) => {
    const h = household([{ name, type, balance, nov: balance }]);
    await detail(fakeApi(routes(h)), h.idOf(name));
    await userEvent
      .setup()
      .press(await screen.findByRole("link", { name: "See your debts on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.debts.url);
  });

  it("a saving has no owner page link", async () => {
    const h = personaHousehold(HOMEOWNER);
    await detail(fakeApi(routes(h)), h.idOf("Cash ISA"));
    expect(await screen.findByTestId("account-detail-hero")).toBeOnTheScreen();
    expect(screen.queryByTestId("account-owner-page")).toBeNull();
  });

  it("an unknown id: We cannot find that account, with Back to accounts", async () => {
    const props = await detail(fakeApi(routes(household())), "not-an-account");
    expect(await screen.findByText("We cannot find that account.")).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
    await userEvent.setup().press(screen.getByRole("button", { name: "Back to accounts" }));
    expect(props.onBackToAccounts).toHaveBeenCalledTimes(1);
  });

  it("loading: nothing for 200 ms, then blocks that stay 400 ms", async () => {
    let answer: (value: unknown) => void = () => {};
    const h = household();
    await detail(
      fakeApi(
        routes(h, {
          "GET /account-details": () =>
            new Promise((resolve) => {
              answer = resolve;
            }),
        }),
      ),
      h.idOf("Mortgage"),
    );
    await act(async () => jest.advanceTimersByTimeAsync(199));
    expect(screen.queryByTestId("account-detail-loading")).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(screen.getByLabelText("Loading this account")).toBeOnTheScreen();
    await act(async () => {
      answer(h.details);
      await jest.advanceTimersByTimeAsync(399);
    });
    expect(screen.getByTestId("account-detail-loading")).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(screen.getByTestId("account-detail-hero")).toBeOnTheScreen();
  });

  it("unavailable: could not load with Try again, never not found or £0", async () => {
    const h = household();
    await detail(
      fakeApi(routes(h, { "GET /accounts": () => fail("unavailable", 503) })),
      h.idOf("Mortgage"),
    );
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(screen.getByText("Check your connection and try again.")).toBeOnTheScreen();
    expect(screen.queryByText("We cannot find that account.")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("out of step: a month without its value, never the connection", async () => {
    const h = household();
    const { value: _v, ...noValue } = h.details[0] as (typeof h.details)[number];
    await detail(
      fakeApi(routes(h, { "GET /account-details": () => [noValue, ...h.details.slice(1)] })),
      h.idOf("Mortgage"),
    );
    expect(await screen.findByText(/did not understand Flump's answer/)).toBeOnTheScreen();
    expect(screen.queryByText(/connection/)).toBeNull();
  });

  it("terms not agreed, and not set up, show their own screens", async () => {
    const h = household();
    await detail(
      fakeApi({
        ...routes(h),
        "GET /accounts": () => fail("forbidden", 403, "terms_not_accepted"),
      }),
      h.idOf("Mortgage"),
    );
    expect(
      await screen.findByRole("header", { name: "Please agree to our terms on the website" }),
    ).toBeOnTheScreen();
  });

  it("not set up: the way to set up, not an account", async () => {
    const h = household();
    await detail(
      fakeApi({ ...routes(h), "GET /user-profile": () => undefined }),
      h.idOf("Mortgage"),
    );
    expect(
      await screen.findByRole("header", { name: "Finish setting up Flump on the website" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("We cannot find that account.")).toBeNull();
  });

  it("pull to refresh keeps the account on screen", async () => {
    const h = household();
    const api = fakeApi(routes(h));
    await detail(api, h.idOf("Mortgage"));
    expect(await screen.findByTestId("account-detail-hero")).toBeOnTheScreen();
    await settle();
    await act(async () => {
      await refreshControl()?.onRefresh();
    });
    expect(api.request).toHaveBeenCalledTimes(8);
    expect(screen.getByTestId("account-detail-hero")).toBeOnTheScreen();
  });
});
