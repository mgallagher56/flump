import { act, render, screen, userEvent, within } from "@testing-library/react-native";
import { Linking } from "react-native";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import { HOMEOWNER, personaHousehold, RENTER } from "../../features/accounts/accountsTestData";
import { household, NOW, routes } from "../../features/check-in/checkInTestData";
import { refreshControl } from "../../testing/refresh";
import { Accounts, type AccountsWebLinks } from "./Accounts";

/** The website's pages (placeholder addresses). */
const LINKS: AccountsWebLinks = {
  setUp: { url: "https://app.test.invalid/app/onboarding", exact: true },
  addAccount: { url: "https://app.test.invalid/app/accounts", exact: true },
  addEstimate: { url: "https://app.test.invalid/app/accounts?add=property", exact: true },
};

async function accounts(api: ReturnType<typeof fakeApi>, links: AccountsWebLinks = LINKS) {
  const props = {
    onSignOut: jest.fn(),
    onOpenAccount: jest.fn(),
    onOpenHistory: jest.fn(),
    onOpenCheckIn: jest.fn(),
    onChangeWhatCounts: jest.fn(),
  };
  const { ui } = withApi(
    <Accounts {...props} marketingOrigin="https://m.test.invalid" links={links} now={NOW} />,
    api.client,
  );
  await render(ui);
  return props;
}

const settle = () => act(async () => jest.advanceTimersByTimeAsync(0));

/** The rows of one group, as a screen reader hears them. */
const rowsIn = (group: string) =>
  within(screen.getByTestId(group))
    .getAllByRole("link")
    .map((r) => r.props.accessibilityLabel as string);

// The first render in a file loads and transforms React Native's components and the engine, which
// on a cold CI cache took more than the first test's 5 s (as CheckIn, run 45850948864). Rendered
// once here, with its own time, each test's 5 s covers only its own work.
beforeAll(async () => {
  await accounts(fakeApi(routes(household())));
  await screen.findByTestId("accounts-hero");
  screen.unmount();
}, 30_000);

describe("Accounts", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("the home owner: the total, each group with its total, in web's order (acceptance 1)", async () => {
    await accounts(fakeApi(routes(personaHousehold(HOMEOWNER))));
    // Own 427,000 less owe 195,600.
    expect(
      await screen.findByLabelText("Total of the accounts listed, £231,400"),
    ).toBeOnTheScreen();
    expect(rowsIn("accounts-own")).toEqual([
      "Current account, £3,400",
      "Easy access savings, Savings, £7,600",
      "Cash ISA, Savings, £10,000",
      "Workplace pension, Pension, £96,000",
      "Home, Property, £310,000",
    ]);
    expect(screen.getByTestId("accounts-own-total").props.accessibilityLabel).toBe(
      "Total you own, £427,000",
    );
    expect(rowsIn("accounts-owe")).toEqual([
      "Residential mortgage, Mortgage, £186,000",
      "Credit card, £1,200",
      "Car loan, Loan, £8,400",
    ]);
    expect(screen.getByTestId("accounts-owe-total").props.accessibilityLabel).toBe(
      "Total you owe, £195,600",
    );
    expect(screen.queryByTestId("accounts-not-counted")).toBeNull();
  });

  it("the renter: one debt has no total; the student loan sits under not counted, with its facts", async () => {
    await accounts(fakeApi(routes(personaHousehold(RENTER))));
    // 13,500 owned less 1,800 owed.
    expect(await screen.findByLabelText("Total of the accounts listed, £11,700")).toBeOnTheScreen();
    expect(rowsIn("accounts-owe")).toEqual(["Credit card, £1,800"]);
    expect(screen.queryByTestId("accounts-owe-total")).toBeNull();
    expect(rowsIn("accounts-not-counted")).toEqual(["Student loan, £38,500"]);
    expect(
      screen.getByText(
        "Repayments come out of your pay as you earn, and any balance left at the end of the repayment term is written off.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Not counting your student loan.")).toBeOnTheScreen();
  });

  it("nothing left out but a choice applies: Change what counts on its own, opening the app's setting (S9)", async () => {
    // With no web app address too: the link opens the app, so it keeps its own words.
    const site = { url: "https://m.test.invalid", exact: false };
    const { onChangeWhatCounts } = await accounts(fakeApi(routes(personaHousehold(HOMEOWNER))), {
      setUp: site,
      addAccount: site,
      addEstimate: site,
    });
    await userEvent.setup().press(await screen.findByRole("link", { name: "Change what counts" }));
    expect(onChangeWhatCounts).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(screen.queryByText(/Not counting/)).toBeNull();
  });

  it("a joint mortgage reads Joint, 50% at half the balance; an overdrawn account is owed (acceptance 6, 7)", async () => {
    await accounts(
      fakeApi(
        routes(
          household([
            {
              name: "Residential mortgage",
              type: "Mortgage",
              balance: -186000,
              ownership: "joint",
              sharePercent: 50,
            },
            {
              name: "Home",
              type: "Property",
              balance: 310000,
              ownership: "joint",
              sharePercent: 50,
            },
            { name: "Current account", type: "Current", balance: -350 },
          ]),
        ),
      ),
    );
    // Half of 186,000 is 93,000; the overdrawn 350 is owed.
    expect(await screen.findByTestId("accounts-owe")).toBeOnTheScreen();
    expect(rowsIn("accounts-owe")).toEqual([
      "Current account, £350",
      "Residential mortgage, Mortgage, Joint, 50%, £93,000",
    ]);
    expect(rowsIn("accounts-own")).toEqual(["Home, Property, Joint, 50%, £155,000"]);
    // One row: a total would repeat it.
    expect(screen.queryByTestId("accounts-own-total")).toBeNull();
    // Owe 93,000 + 350 = 93,350; own 155,000; the total 155,000 - 93,350 = 61,650.
    expect(screen.getByTestId("accounts-owe-total").props.accessibilityLabel).toBe(
      "Total you owe, £93,350",
    );
    expect(screen.getByLabelText("Total of the accounts listed, £61,650")).toBeOnTheScreen();
    expect(screen.queryByText("-£350")).toBeNull();
  });

  it("a row opens its account; the links open history, the check-in and the website", async () => {
    const h = household();
    const props = await accounts(fakeApi(routes(h)));
    const user = userEvent.setup();
    await user.press(await screen.findByRole("link", { name: "Mortgage, £185,000" }));
    expect(props.onOpenAccount).toHaveBeenCalledWith(h.idOf("Mortgage"));
    await user.press(screen.getByRole("link", { name: "See how it has changed" }));
    expect(props.onOpenHistory).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole("button", { name: "Start monthly check-in" }));
    expect(props.onOpenCheckIn).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole("link", { name: "Add an account on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.addAccount.url);
    // A mortgage with no home listed: the line asks for an estimate.
    expect(
      screen.getByText("Your home's value is not counted until you add an estimate."),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole("link", { name: "Add an estimate on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.addEstimate.url);
  });

  it("no accounts: No accounts yet with web's sentence and the website link, never £0", async () => {
    await accounts(fakeApi(routes(household([]))));
    expect(await screen.findByRole("header", { name: "No accounts yet" })).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Add a current account, savings or pension and your totals will appear here.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.queryByTestId("accounts-own")).toBeNull();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: "Add an account on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.addAccount.url);
  });

  it("with no web app address, the links say they open the Flump website", async () => {
    const site = { url: "https://m.test.invalid", exact: false };
    await accounts(fakeApi(routes(household([]))), {
      setUp: site,
      addAccount: site,
      addEstimate: site,
    });
    expect(await screen.findByRole("link", { name: "Open the Flump website" })).toBeOnTheScreen();
  });

  it("loading: nothing for 200 ms, then blocks that stay 400 ms, then the list", async () => {
    let answer: (value: unknown) => void = () => {};
    const h = household();
    await accounts(
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
    expect(screen.queryByTestId("accounts-loading")).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(screen.getByLabelText("Loading your accounts")).toBeOnTheScreen();
    await act(async () => {
      answer(h.accounts);
      await jest.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByTestId("accounts-loading")).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTimeAsync(349));
    expect(screen.getByTestId("accounts-loading")).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(screen.queryByTestId("accounts-loading")).toBeNull();
    expect(screen.getByTestId("accounts-hero")).toBeOnTheScreen();
  });

  it("unavailable after the retries: could not load with Try again, never No accounts yet or £0", async () => {
    let down = true;
    const h = household();
    const api = fakeApi(
      routes(h, { "GET /accounts": () => (down ? fail("unavailable", 503) : h.accounts) }),
    );
    await accounts(api);
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(screen.getByText("We could not load your accounts")).toBeOnTheScreen();
    expect(screen.getByText("Check your connection and try again.")).toBeOnTheScreen();
    expect(screen.queryByText("No accounts yet")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    down = false;
    await userEvent.setup().press(screen.getByTestId("accounts-retry"));
    await settle();
    expect(screen.getByTestId("accounts-hero")).toBeOnTheScreen();
  });

  it("out of step: the out-of-step words, never the connection (acceptance 12)", async () => {
    const h = household();
    const { balance: _left, ...noBalance } = h.accounts[0] as (typeof h.accounts)[number];
    await accounts(
      fakeApi(routes(h, { "GET /accounts": () => [noBalance, ...h.accounts.slice(1)] })),
    );
    expect(
      await screen.findByText(
        "This version of the app did not understand Flump's answer. Try again later, or update the app if an update is available.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/connection/)).toBeNull();
    expect(screen.queryByText("No accounts yet")).toBeNull();
    expect(screen.getByTestId("accounts-retry")).toBeOnTheScreen();
  });

  it("an older backend (fields missing) and a newer one (fields added) still show the list", async () => {
    const h = household([
      {
        name: "Mortgage",
        type: "Mortgage",
        balance: -200000,
        ownership: "joint",
        sharePercent: 50,
      },
      { name: "Current account", type: "Current", balance: 1000, oct: 900 },
    ]);
    // No name, subtype, share or ownership on the first; a later backend's field on the second.
    const older = h.accounts.map(({ name: _n, accountSubtype: _s, sharePercent: _p, ...a }, i) =>
      i === 0 ? { ...a, ownership: undefined } : { ...a, name: "Current account", later: 1 },
    );
    const details = h.details.map(({ source: _s, ...d }) => ({ ...d, laterField: "new" }));
    await accounts(
      fakeApi(routes(h, { "GET /accounts": () => older, "GET /account-details": () => details })),
    );
    // With no ownership the mortgage counts whole: 1,000 - 200,000.
    expect(
      await screen.findByLabelText("Total of the accounts listed, minus £199,000"),
    ).toBeOnTheScreen();
    expect(rowsIn("accounts-owe")).toEqual(["Mortgage, £200,000"]);
  });

  it("terms not agreed: the terms screen, with Sign out", async () => {
    const props = await accounts(
      fakeApi({
        ...routes(household()),
        "GET /accounts": () => fail("forbidden", 403, "terms_not_accepted"),
      }),
    );
    expect(
      await screen.findByRole("header", { name: "Please agree to our terms on the website" }),
    ).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Sign out" }));
    expect(props.onSignOut).toHaveBeenCalledTimes(1);
  });

  it("no profile yet: the way to set up on the website, not an empty list", async () => {
    await accounts(fakeApi({ ...routes(household()), "GET /user-profile": () => undefined }));
    expect(
      await screen.findByRole("header", { name: "Finish setting up Flump on the website" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("No accounts yet")).toBeNull();
  });

  it("pull to refresh reads again and keeps the list; a failed refresh keeps it too", async () => {
    let down = false;
    const h = household();
    const api = fakeApi(
      routes(h, { "GET /accounts": () => (down ? fail("unavailable", 503) : h.accounts) }),
    );
    await accounts(api);
    expect(await screen.findByTestId("accounts-hero")).toBeOnTheScreen();
    await settle();
    down = true;
    await act(async () => {
      void refreshControl()?.onRefresh();
    });
    expect(api.calls.filter((c) => c.path === "/accounts").length).toBeGreaterThanOrEqual(2);
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(refreshControl()?.refreshing).toBe(false);
    expect(screen.getByTestId("accounts-hero")).toBeOnTheScreen();
    expect(screen.queryByTestId("accounts-error")).toBeNull();
  });
});
