import { UpsertSnapshotRequest } from "@flump/api-contract";
import {
  buildCheckInSteps,
  calculateCheckInBalance,
  checkInPayload,
} from "@flump/finance-engine/check-in";
import { formatCurrency } from "@flump/format";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { AccessibilityInfo, Linking } from "react-native";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import { household, MONTH, NOW, routes, SEEDS } from "../../features/check-in/checkInTestData";
import { CheckIn } from "./CheckIn";

const PUT = `PUT /snapshots/${MONTH}`;

async function open(api: ReturnType<typeof fakeApi>, props: { offline?: boolean } = {}) {
  const onClose = jest.fn();
  const { ui } = withApi(
    <CheckIn marketingOrigin="https://m.test.invalid" onClose={onClose} now={NOW} {...props} />,
    api.client,
  );
  await render(ui);
  await screen.findByTestId("check-in-cards");
  return { onClose };
}

const puts = (api: ReturnType<typeof fakeApi>) =>
  api.calls.filter((c) => c.method === "PUT").map((c) => c.body as Record<string, unknown>);

describe("CheckIn walk-through", () => {
  it("shows one card per account in web's order and ends with a complete save", async () => {
    const h = household();
    const api = fakeApi(routes(h));
    await open(api);
    const user = userEvent.setup();

    // CHECK_IN_TYPE_ORDER: Current, Saving, Credit Card, Investment, Pension, Mortgage.
    expect(screen.getByText("Account 1 of 6")).toBeOnTheScreen();
    expect(screen.getByText("Current account")).toBeOnTheScreen();

    // Update sends the typed figure.
    await user.type(screen.getByTestId("check-in-input"), "1250.40");
    await user.press(screen.getByTestId("check-in-update"));
    expect(await screen.findByText("Account 2 of 6")).toBeOnTheScreen();
    expect(screen.getByText("Easy access savings")).toBeOnTheScreen();

    // No change sends the saved balance.
    await user.press(screen.getByTestId("check-in-no-change"));
    expect(await screen.findByText("Account 3 of 6")).toBeOnTheScreen();

    // Keep the rest: credit card, ISA, pension (the mortgage has a calculated figure).
    await user.press(screen.getByRole("button", { name: "Keep the other 3 balances as they are" }));
    expect(await screen.findByText("Mortgage")).toBeOnTheScreen();
    expect(screen.getByText("Account 6 of 6")).toBeOnTheScreen();
    expect(
      screen.getByText("3 balances kept as they are. You can still change any of them."),
    ).toBeOnTheScreen();

    await user.press(screen.getByTestId("check-in-keep"));
    expect(await screen.findByText("November is checked in.")).toBeOnTheScreen();

    const bodies = puts(api);
    expect(bodies).toHaveLength(4);
    for (const body of bodies) {
      expect(UpsertSnapshotRequest.safeParse(body).success).toBe(true);
      expect(body.checkIn).toBe(true);
    }
    expect(bodies[0]).toEqual({
      values: [{ accountId: h.idOf("Current account"), value: 1250.4, source: "manual" }],
      checkIn: true,
    });
    expect(bodies[1]).toEqual({
      values: [{ accountId: h.idOf("Easy access savings"), value: 8200, source: "confirmed" }],
      checkIn: true,
    });
    // The credit card goes as the amount owed (positive): the backend signs debts by type.
    expect(bodies[2]).toEqual({
      values: [
        { accountId: h.idOf("Credit card"), value: 650, source: "confirmed" },
        { accountId: h.idOf("Stocks and shares ISA"), value: 15500, source: "confirmed" },
        { accountId: h.idOf("Workplace pension"), value: 48000, source: "confirmed" },
      ],
      checkIn: true,
    });
    // Only the last save marks the month done.
    expect(bodies.slice(0, 3).some((b) => "complete" in b)).toBe(false);
    expect(bodies[3]?.complete).toBe(true);
    expect(bodies[3]?.values).toEqual([
      { accountId: h.idOf("Mortgage"), value: expect.any(Number), source: "calculated" },
    ]);
  });

  it("each body is the engine's payload builder output, not a hand-built one", async () => {
    const h = household();
    const api = fakeApi(routes(h));
    await open(api);
    await userEvent.setup().press(screen.getByTestId("check-in-no-change"));
    await screen.findByText("Account 2 of 6");
    const step = { accountId: h.idOf("Current account") };
    // The engine's own builder for "No change" on the first account, with nothing answered before.
    const expected = checkInPayload(
      buildCheckInSteps(h.accounts, h.details, MONTH),
      [{ accountId: step.accountId, value: 1204, source: "confirmed" }],
      new Set(),
      { withSource: true },
    );
    expect(puts(api)[0]).toEqual(expected);
  });

  it("shows the engine's calculated figure with the badge, and an override sends the typed figure", async () => {
    const h = household();
    const api = fakeApi(routes(h));
    await open(api);
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Keep the other 5 balances as they are" }));
    await screen.findByTestId("check-in-calculated");
    expect(screen.getByText("Calculated")).toBeOnTheScreen();
    // Observed from the engine for the same inputs: the app does no arithmetic.
    const calc = calculateCheckInBalance({
      type: "Mortgage",
      interestRate: 4.5,
      monthlyPayment: 1100,
      base: { value: -185000, month: "2026-10" },
      month: MONTH,
      savedBalance: -185000,
    });
    expect(screen.getByTestId("check-in-calculated-figure")).toHaveTextContent(
      formatCurrency(Math.round(calc?.value ?? Number.NaN)),
    );
    expect(
      screen.getByText(
        "From your interest rate of 4.5% and monthly payment of £1,100 since October 2026.",
      ),
    ).toBeOnTheScreen();

    await user.type(screen.getByTestId("check-in-input"), "184000");
    await user.press(screen.getByTestId("check-in-update"));
    await screen.findByText("November is checked in.");
    expect(puts(api).at(-1)?.values).toEqual([
      { accountId: h.idOf("Mortgage"), value: 184000, source: "manual" },
    ]);
  });

  it("offers no calculated figure when the saved balance differs from the latest recorded month", async () => {
    const seeds = SEEDS.map((s) => (s.name === "Mortgage" ? { ...s, balance: -184500 } : s));
    const api = fakeApi(routes(household(seeds)));
    await open(api);
    await userEvent.setup().press(screen.getByRole("button", { name: /Keep all 6 balances/ }));
    expect(await screen.findByText("November is checked in.")).toBeOnTheScreen();
    expect(puts(api)[0]?.values).toContainEqual({
      accountId: expect.any(String),
      value: 184500,
      source: "confirmed",
    });
  });

  it("never sends a blank field, and never as 0", async () => {
    const api = fakeApi(routes(household()));
    await open(api);
    const user = userEvent.setup();
    const update = screen.getByTestId("check-in-update");
    expect(update).toBeDisabled();
    await user.type(screen.getByTestId("check-in-input"), "12");
    expect(screen.getByTestId("check-in-update")).toBeEnabled();
    await user.clear(screen.getByTestId("check-in-input"));
    expect(screen.getByTestId("check-in-update")).toBeDisabled();
    await user.press(screen.getByTestId("check-in-update"));
    expect(puts(api)).toHaveLength(0);
  });

  it("a failed save keeps the typed figure and offers to try again", async () => {
    let down = true;
    const h = household();
    const base = routes(h);
    const api = fakeApi({
      ...base,
      [PUT]: (body) => (down ? fail("unavailable") : base[PUT]?.(body)),
    });
    await open(api);
    const user = userEvent.setup();
    await user.type(screen.getByTestId("check-in-input"), "1300");
    await user.press(screen.getByTestId("check-in-update"));
    expect(
      await screen.findByText("We could not save this balance. Nothing has changed. Try again."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Account 1 of 6")).toBeOnTheScreen();
    expect(screen.getByTestId("check-in-input").props.value).toBe("1,300");

    down = false;
    await user.press(screen.getByTestId("check-in-retry-save"));
    expect(await screen.findByText("Account 2 of 6")).toBeOnTheScreen();
    expect(puts(api)).toHaveLength(2);
    expect(puts(api)[1]?.values).toEqual([
      { accountId: h.idOf("Current account"), value: 1300, source: "manual" },
    ]);
  });

  it("a double tap sends one request", async () => {
    let release: () => void = () => {};
    const h = household();
    const base = routes(h);
    const api = fakeApi({
      ...base,
      [PUT]: (body) =>
        new Promise((resolve) => {
          release = () => resolve(base[PUT]?.(body));
        }),
    });
    await open(api);
    const noChange = screen.getByTestId("check-in-no-change");
    await act(async () => {
      fireEvent.press(noChange);
      fireEvent.press(noChange);
    });
    await act(async () => release());
    await screen.findByText("Account 2 of 6");
    expect(puts(api)).toHaveLength(1);
  });

  it("each card is one spoken group, and the new position is announced", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    announce.mockClear();
    const api = fakeApi(routes(household()));
    await open(api);
    expect(
      screen.getByLabelText("Current account, £1,204, recorded in October 2026, account 1 of 6"),
    ).toBeOnTheScreen();
    expect(announce).not.toHaveBeenCalled();
    await userEvent.setup().press(screen.getByTestId("check-in-no-change"));
    await screen.findByText("Account 2 of 6");
    expect(announce).toHaveBeenCalledWith("Account 2 of 6");
    // Moving between cards never shows a skeleton.
    expect(screen.queryByTestId("check-in-skeleton")).toBeNull();
    announce.mockRestore();
  });

  it("offline: the cards show, saving is off and says why", async () => {
    const api = fakeApi(routes(household()));
    await open(api, { offline: true });
    expect(
      screen.getByText(
        "Saving needs a connection. Your answers will save once you are back online.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("check-in-no-change")).toBeDisabled();
    expect(screen.getByTestId("check-in-keep-rest")).toBeDisabled();
  });

  it("says nothing about streaks, targets or missed months", async () => {
    const api = fakeApi(routes(household()));
    await open(api);
    const text = JSON.stringify(screen.toJSON());
    expect(text).not.toMatch(/streak|target|missed|overdue|behind/i);
  });
});

describe("CheckIn resumed or finished", () => {
  const recorded = (names: readonly string[]) =>
    SEEDS.map((seed) =>
      names.includes(seed.name) ? { ...seed, nov: Math.abs(seed.balance) } : seed,
    );

  it("a part-done month resumes at the first card with nothing recorded", async () => {
    const h = household(recorded(["Current account"]), {
      latestCompletedMonth: "2026-10",
      latestStartedMonth: MONTH,
    });
    await open(fakeApi(routes(h)));
    expect(screen.getByText("Account 2 of 6")).toBeOnTheScreen();
    expect(screen.getByText("Easy access savings")).toBeOnTheScreen();
  });

  it("a finished month opens on the summary", async () => {
    const h = household(recorded(SEEDS.map((x) => x.name)), {
      latestCompletedMonth: MONTH,
      latestStartedMonth: MONTH,
    });
    const api = fakeApi(routes(h));
    const { ui } = withApi(
      <CheckIn marketingOrigin="https://m.test.invalid" onClose={jest.fn()} now={NOW} />,
      api.client,
    );
    await render(ui);
    expect(await screen.findByText("November is checked in.")).toBeOnTheScreen();
    expect(puts(api)).toHaveLength(0);
  });

  it("every account recorded but not finished: Finish saves complete with no balance", async () => {
    const h = household(recorded(SEEDS.map((x) => x.name)), {
      latestCompletedMonth: "2026-10",
      latestStartedMonth: MONTH,
    });
    const api = fakeApi(routes(h));
    await open(api);
    await userEvent.setup().press(screen.getByRole("button", { name: "Finish check-in" }));
    expect(await screen.findByText("November is checked in.")).toBeOnTheScreen();
    expect(puts(api)).toEqual([{ values: [], complete: true }]);
  });

  it("Change a balance goes back to the cards and offers no second Finish", async () => {
    const h = household(recorded(SEEDS.map((x) => x.name)), {
      latestCompletedMonth: MONTH,
      latestStartedMonth: MONTH,
    });
    const { ui } = withApi(
      <CheckIn marketingOrigin="https://m.test.invalid" onClose={jest.fn()} now={NOW} />,
      fakeApi(routes(h)).client,
    );
    await render(ui);
    await userEvent.setup().press(await screen.findByRole("button", { name: "Change a balance" }));
    expect(screen.getByText("Account 1 of 6")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Finish check-in" })).toBeNull();
  });
});

describe("CheckIn loading, failure and empty", () => {
  it("a failed load shows the error with Try again, never 'no accounts'", async () => {
    let down = true;
    const h = household();
    const base = routes(h);
    const api = fakeApi({
      ...base,
      // A 4xx is not retried, so the error shows at once.
      "GET /accounts": () => (down ? fail("forbidden", 403) : h.accounts),
    });
    const { ui } = withApi(
      <CheckIn marketingOrigin="https://m.test.invalid" onClose={jest.fn()} now={NOW} />,
      api.client,
    );
    await render(ui);
    expect(await screen.findByText("We could not load your accounts")).toBeOnTheScreen();
    expect(screen.queryByText("Add an account first, then its balance appears here.")).toBeNull();
    down = false;
    await userEvent.setup().press(screen.getByTestId("check-in-retry"));
    expect(await screen.findByText("Account 1 of 6")).toBeOnTheScreen();
  });

  it("an empty list shows one sentence and one button to the website", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const h = household([], { latestCompletedMonth: null, latestStartedMonth: null });
    const api = fakeApi(routes(h));
    const { ui } = withApi(
      <CheckIn marketingOrigin="https://m.test.invalid" onClose={jest.fn()} now={NOW} />,
      api.client,
    );
    await render(ui);
    expect(
      await screen.findByText("Add an account first, then its balance appears here."),
    ).toBeOnTheScreen();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: "Add an account on the website" }));
    expect(open).toHaveBeenCalledWith("https://m.test.invalid");
    open.mockRestore();
  });
});

describe("CheckIn loading timing", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows nothing for 200 ms, then a skeleton", async () => {
    const api = fakeApi({
      ...routes(household()),
      "GET /accounts": () => new Promise(() => {}),
    });
    const { ui } = withApi(
      <CheckIn marketingOrigin="https://m.test.invalid" onClose={jest.fn()} now={NOW} />,
      api.client,
    );
    await render(ui);
    await act(async () => jest.advanceTimersByTime(199));
    expect(screen.queryByTestId("check-in-skeleton")).toBeNull();
    await act(async () => jest.advanceTimersByTime(1));
    expect(screen.getByTestId("check-in-skeleton")).toBeOnTheScreen();
  });
});
