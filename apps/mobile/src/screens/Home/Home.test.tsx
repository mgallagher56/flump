import { light } from "@flump/tokens/native";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Linking, StyleSheet, type TextStyle } from "react-native";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import { household, MONTH, NOW, routes } from "../../features/check-in/checkInTestData";
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

async function home(api: ReturnType<typeof fakeApi>, links: HomeWebLinks = LINKS) {
  const onSignOut = jest.fn();
  const onOpenCheckIn = jest.fn();
  const { ui } = withApi(
    <Home
      onSignOut={onSignOut}
      onOpenCheckIn={onOpenCheckIn}
      marketingOrigin="https://m.test.invalid"
      links={links}
      now={NOW}
    />,
    api.client,
  );
  await render(ui);
  return { onSignOut, onOpenCheckIn };
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
    });
    await userEvent
      .setup()
      .press(await screen.findByRole("link", { name: "Open the Flump website" }));
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
    expect(api.request).toHaveBeenCalledTimes(4);
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
});
