import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import { HOMEOWNER, personaHousehold, RENTER } from "../../features/accounts/accountsTestData";
import { household, NOW, routes } from "../../features/check-in/checkInTestData";
import { refreshControl } from "../../testing/refresh";
import { NetWorthHistory, type NetWorthHistoryWebLinks } from "./NetWorthHistory";

const LINKS: NetWorthHistoryWebLinks = {
  setUp: { url: "https://app.test.invalid/app/onboarding", exact: true },
  addAccount: { url: "https://app.test.invalid/app/accounts", exact: true },
  addEarlierMonths: { url: "https://app.test.invalid/app/accounts/history", exact: true },
};

async function history(api: ReturnType<typeof fakeApi>) {
  const props = { onSignOut: jest.fn(), onOpenCheckIn: jest.fn() };
  const { ui } = withApi(
    <NetWorthHistory {...props} marketingOrigin="https://m.test.invalid" links={LINKS} now={NOW} />,
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
  await history(fakeApi(routes(personaHousehold(RENTER))));
  await screen.findByTestId("history-hero");
  screen.unmount();
}, 30_000);

describe("NetWorthHistory", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("the home owner: +£2,575 September to October, the chart and £15,450 since May (acceptance 2)", async () => {
    await history(fakeApi(routes(personaHousehold(HOMEOWNER))));
    // October 228,825 less September 226,250.
    expect(
      await screen.findByLabelText("Net worth change, plus £2,575, September to October 2026."),
    ).toBeOnTheScreen();
    expect(screen.getByText("+£2,575")).toBeOnTheScreen();
    // May 215,950 to November's 231,400.
    expect(screen.getByTestId("history-chart-summary")).toHaveTextContent(
      "Up £15,450 since May 2026. The dashed end is this month's saved balances, not yet recorded.",
    );
    expect(
      screen.getByTestId("history-chart", { includeHiddenElements: true }).props
        .importantForAccessibility,
    ).toBe("no-hide-descendants");
    expect(screen.getByTestId("history-months-row-2026-10").props.accessibilityLabel).toBe(
      "October 2026, £228,825, Recorded",
    );
    expect(screen.getByTestId("history-months-row-2026-11").props.accessibilityLabel).toBe(
      "November 2026, £231,400, Carried forward",
    );
    expect(screen.queryByTestId("history-few-months")).toBeNull();
  });

  it("the renter: +£465, the student loan left out, changes by account behind the control", async () => {
    const props = await history(fakeApi(routes(personaHousehold(RENTER))));
    // October 11,235 less September 10,770.
    expect(
      await screen.findByLabelText(
        "Net worth change, plus £465, September to October 2026. Not counting your student loan.",
      ),
    ).toBeOnTheScreen();
    // May 8,910 to November 11,700.
    expect(screen.getByTestId("history-chart-summary")).toHaveTextContent(
      "Up £2,790 since May 2026. The dashed end is this month's saved balances, not yet recorded.",
    );
    const user = userEvent.setup();
    // November is not checked in yet: the prompt opens the check-in.
    await user.press(screen.getByRole("link", { name: "November check-in not done yet" }));
    expect(props.onOpenCheckIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Change by account, September 2026 to October 2026")).toBeNull();
    await user.press(screen.getByRole("button", { name: "Show changes by account" }));
    expect(screen.getByText("Change by account, September 2026 to October 2026")).toBeOnTheScreen();
  });

  it("each account's change reads up or down in words, a debt marked owed", async () => {
    const h = personaHousehold(RENTER);
    await history(fakeApi(routes(h)));
    await userEvent
      .setup()
      .press(await screen.findByRole("button", { name: "Show changes by account" }));
    const row = (name: string) =>
      screen.getByTestId(`history-change-rows-row-${h.idOf(name)}`).props.accessibilityLabel;
    // The card fell 35 owed, which raised net worth 35.
    expect(row("Credit card")).toBe("Credit card (owed), up £35");
    expect(row("Workplace pension")).toBe("Workplace pension, up £260");
    expect(screen.getByText("+£35")).toBeOnTheScreen();
  });

  it("two recorded months: the change, but no chart and web's sentence (acceptance 8)", async () => {
    await history(
      fakeApi(
        routes(
          household([
            { name: "Current account", type: "Current", balance: 900, sep: 700, oct: 800 },
          ]),
        ),
      ),
    );
    // 800 - 700.
    expect(await screen.findByLabelText(/^Net worth change, plus £100/)).toBeOnTheScreen();
    expect(screen.queryByTestId("history-chart", { includeHiddenElements: true })).toBeNull();
    expect(
      screen.getByText(
        "You have two months of history. The chart appears after your third check-in.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("history-chart-summary")).toHaveTextContent(
      "Net worth recorded for October 2026: £800.",
    );
  });

  it("one recorded month: Monthly change with No earlier month", async () => {
    await history(
      fakeApi(
        routes(household([{ name: "Current account", type: "Current", balance: 900, oct: 800 }])),
      ),
    );
    expect(await screen.findByText("No earlier month")).toBeOnTheScreen();
    expect(screen.getByText("Monthly change")).toBeOnTheScreen();
    expect(
      screen.getByText("The change shows once you have two months recorded."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("checked in this month: no prompt, and the next check-in date", async () => {
    await history(
      fakeApi(
        routes(
          household(
            [{ name: "Current account", type: "Current", balance: 900, oct: 800, nov: 900 }],
            { latestCompletedMonth: "2026-11", latestStartedMonth: "2026-11" },
          ),
        ),
      ),
    );
    expect(await screen.findByTestId("history-hero")).toBeOnTheScreen();
    expect(screen.queryByText(/check-in not done yet/)).toBeNull();
    // No check-in day chosen: the 1st of next month.
    expect(screen.getByText("Next check-in: 1 December 2026")).toBeOnTheScreen();
  });

  it("no recorded month: No monthly balances yet, the check-in and earlier months on the website", async () => {
    const props = await history(
      fakeApi(routes(household([{ name: "Current account", type: "Current", balance: 900 }]))),
    );
    expect(
      await screen.findByRole("header", { name: "No monthly balances yet" }),
    ).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Start monthly check-in" }));
    expect(props.onOpenCheckIn).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole("link", { name: "Add earlier months on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINKS.addEarlierMonths.url);
  });

  it("no accounts: web's sentence and Add an account on the website", async () => {
    await history(fakeApi(routes(household([]))));
    expect(
      await screen.findByText(
        "Add your accounts first. Their balances then become your first month of history.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Add an account on the website" })).toBeOnTheScreen();
  });

  it("loading: nothing for 200 ms, then blocks", async () => {
    await history(fakeApi(routes(household(), { "GET /accounts": () => new Promise(() => {}) })));
    await act(async () => jest.advanceTimersByTimeAsync(199));
    expect(screen.queryByTestId("history-loading")).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(screen.getByLabelText("Loading your net worth history")).toBeOnTheScreen();
  });

  it("unavailable: could not load with Try again, never the empty words or £0", async () => {
    await history(
      fakeApi(routes(household(), { "GET /account-details": () => fail("server", 500) })),
    );
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(screen.getByText("We could not load your accounts")).toBeOnTheScreen();
    expect(screen.queryByText("No monthly balances yet")).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.getByTestId("history-retry")).toBeOnTheScreen();
  });

  it("out of step: never the connection", async () => {
    const h = household();
    await history(fakeApi(routes(h, { "GET /accounts": () => [{ id: "x", type: "Current" }] })));
    expect(await screen.findByText(/did not understand Flump's answer/)).toBeOnTheScreen();
    expect(screen.queryByText(/connection/)).toBeNull();
  });

  it("terms and not set up show their own screens", async () => {
    await history(
      fakeApi({
        ...routes(household()),
        "GET /snapshots/check-ins": () => fail("forbidden", 403, "terms_not_accepted"),
      }),
    );
    expect(
      await screen.findByRole("header", { name: "Please agree to our terms on the website" }),
    ).toBeOnTheScreen();
  });

  it("not set up: the way to set up", async () => {
    await history(fakeApi({ ...routes(household()), "GET /user-profile": () => undefined }));
    expect(
      await screen.findByRole("header", { name: "Finish setting up Flump on the website" }),
    ).toBeOnTheScreen();
  });

  it("pull to refresh keeps the history on screen", async () => {
    const api = fakeApi(routes(personaHousehold(RENTER)));
    await history(api);
    expect(await screen.findByTestId("history-hero")).toBeOnTheScreen();
    await settle();
    await act(async () => {
      await refreshControl()?.onRefresh();
    });
    expect(api.request).toHaveBeenCalledTimes(8);
    expect(screen.getByTestId("history-hero")).toBeOnTheScreen();
  });
});
