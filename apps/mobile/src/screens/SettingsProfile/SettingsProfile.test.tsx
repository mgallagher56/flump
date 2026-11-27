import { act, fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";
import { AccessibilityInfo, Linking, ScrollView } from "react-native";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import { household, NOW, routes } from "../../features/check-in/checkInTestData";
import { Home } from "../Home";
import { SettingsProfile, type SettingsProfileProps } from "./SettingsProfile";

const SET_UP = { url: "https://app.test.invalid/app/onboarding", exact: true };
const WEBSITE = { url: "https://app.test.invalid/app/profile?tab=profile", exact: true };

/** A home owner: the property choice changes the figure, the student loan one does not. */
const OWNER = [
  { name: "Home", type: "Property", balance: 310000, oct: 309500 },
  { name: "Mortgage", type: "Mortgage", balance: -186000, oct: -186550 },
  { name: "Current account", type: "Current", balance: 3400, oct: 3360 },
] as const;

const props = (over: Partial<SettingsProfileProps> = {}): SettingsProfileProps => ({
  offline: false,
  onRetry: jest.fn(),
  onSignOut: jest.fn(),
  marketingOrigin: "https://m.test.invalid",
  setUp: SET_UP,
  website: WEBSITE,
  ...over,
});

async function profilePage(
  api: ReturnType<typeof fakeApi>,
  over: Partial<SettingsProfileProps> = {},
) {
  const { ui, queryClient } = withApi(<SettingsProfile {...props(over)} />, api.client);
  await render(ui);
  return { queryClient };
}

/** Lets every read answer and the screen hear of it, inside act. */
const settle = () => act(async () => jest.advanceTimersByTimeAsync(0));
const patches = (api: ReturnType<typeof fakeApi>) => api.calls.filter((c) => c.method === "PATCH");
const gets = (api: ReturnType<typeof fakeApi>) => api.calls.filter((c) => c.method === "GET");

// The first render in a file loads and transforms React Native's components, which on a cold CI
// cache took more than the first test's 5 s (PR #962, as CheckIn's run 45850948864). Rendered once
// here, with its own time, each test's 5 s covers only its own work.
beforeAll(async () => {
  await profilePage(fakeApi(routes(household(OWNER))));
  screen.unmount();
}, 30_000);

describe("SettingsProfile", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("shows web's groups in order, in web's words, then the website for the rest", async () => {
    await profilePage(fakeApi(routes(household(OWNER))));
    await settle();
    expect(screen.getAllByRole("header").map((h) => h.props.children)).toEqual([
      "Your details",
      "What counts in your net worth",
      "Monthly check-in",
      "Sections you use",
    ]);
    expect(screen.getByLabelText("First name").props.value).toBe("Sam");
    expect(screen.getByLabelText("Last name").props.value).toBe("Taylor");
    expect(
      screen.getByText(
        "Other debts, including loans secured on your home, always count. Changes are saved straight away.",
      ),
    ).toBeOnTheScreen();
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole("link", { name: "Open Settings on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(WEBSITE.url);
  });

  it("with no web app address, the link says it opens the Flump website and the page still says what is there", async () => {
    await profilePage(fakeApi(routes(household(OWNER))), {
      website: { url: "https://m.test.invalid", exact: false },
    });
    await settle();
    expect(screen.getByTestId("settings-profile-on-website")).toHaveTextContent(
      "Your picture, age and pay, tax details, partner mode, check-in questions, Connect AI and deleting your financial data are on the Flump website for now.",
    );
    expect(screen.queryByRole("link", { name: "Open Settings on the website" })).toBeNull();
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole("link", { name: "Open the Flump website" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://m.test.invalid");
  });

  it("opened from Home's link, it scrolls to the net worth choices once", async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo").mockImplementation(() => {});
    scrollTo.mockClear();
    await profilePage(fakeApi(routes(household(OWNER))), { focus: "netWorth" });
    await settle();
    const group = screen.getByTestId("settings-net-worth");
    await fireEvent(group, "layout", {
      nativeEvent: { layout: { x: 0, y: 640, width: 1, height: 1 } },
    });
    await fireEvent(group, "layout", {
      nativeEvent: { layout: { x: 0, y: 700, width: 1, height: 1 } },
    });
    expect(scrollTo.mock.calls).toEqual([[{ y: 640, animated: false }]]);
  });

  it("opened from Settings, it does not scroll", async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo").mockImplementation(() => {});
    scrollTo.mockClear();
    await profilePage(fakeApi(routes(household(OWNER))));
    await settle();
    await fireEvent(screen.getByTestId("settings-net-worth"), "layout", {
      nativeEvent: { layout: { x: 0, y: 640, width: 1, height: 1 } },
    });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("offers only the choice that changes a figure: property for a home owner", async () => {
    await profilePage(fakeApi(routes(household(OWNER))));
    await settle();
    const property = screen.getByRole("switch", {
      name: "Count property you own, less the mortgage on it",
    });
    expect(property.props.accessibilityState.checked).toBe(true);
    expect(screen.queryByRole("switch", { name: "Count your student loan as a debt" })).toBeNull();
  });

  it("hides the group with no property, mortgage or student loan account", async () => {
    await profilePage(
      fakeApi(routes(household([{ name: "Current account", type: "Current", balance: 10 }]))),
    );
    await settle();
    expect(screen.queryByText("What counts in your net worth")).toBeNull();
    expect(screen.getByText("Monthly check-in")).toBeOnTheScreen();
  });

  it("offers both choices when the accounts cannot be read (unknown is not no)", async () => {
    const h = household(OWNER);
    await profilePage(fakeApi(routes(h, { "GET /accounts": () => fail("server", 503) })));
    await settle();
    expect(screen.getAllByRole("switch").map((s) => s.props.accessibilityLabel)).toEqual([
      "Count property you own, less the mortgage on it",
      "Count your student loan as a debt",
      "Self Assessment",
    ]);
  });

  it("a net worth switch saves at once, says Saved, and Home's figure follows with no new read", async () => {
    const h = household(OWNER);
    const api = fakeApi(
      routes(h, {
        "PATCH /user-profile": (body) => ({
          ...h.profile,
          ...(body as object),
          updatedAt: "2026-11-20T12:05:00.000Z",
        }),
      }),
    );
    const { ui } = withApi(
      <>
        <Home
          onSignOut={jest.fn()}
          onOpenCheckIn={jest.fn()}
          onOpenHistory={jest.fn()}
          onChangeWhatCounts={jest.fn()}
          onAddAccount={jest.fn()}
          onAddEstimate={jest.fn()}
          marketingOrigin="https://m.test.invalid"
          links={{
            setUp: SET_UP,
            addBudget: SET_UP,
            addSpending: SET_UP,
          }}
          now={NOW}
        />
        <SettingsProfile {...props()} />
      </>,
      api.client,
    );
    await render(ui);
    await settle();
    // 310,000 - 186,000 + 3,400 with the home counted.
    expect(within(screen.getByTestId("home-hero")).getByText("£127,400")).toBeOnTheScreen();
    const readsBefore = gets(api).length;

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(
        screen.getByRole("switch", { name: "Count property you own, less the mortgage on it" }),
      );
    await settle();

    expect(patches(api)).toEqual([
      {
        method: "PATCH",
        path: "/user-profile",
        body: { netWorthCountsProperty: false },
        ifMatch: `"${NOW().toISOString()}"`,
      },
    ]);
    // Only the current account is left: 3,400.
    expect(within(screen.getByTestId("home-hero")).getByText("£3,400")).toBeOnTheScreen();
    expect(screen.getByText("Not counting your property or mortgage.")).toBeOnTheScreen();
    expect(gets(api)).toHaveLength(readsBefore);
    expect(screen.getByTestId("settings-saved")).toHaveTextContent("Saved");
    expect(
      screen.getByRole("switch", { name: "Count property you own, less the mortgage on it" }).props
        .accessibilityState.checked,
    ).toBe(false);
  });

  it("a net worth switch moves the hero but not the strip's What you owe, which is consumer debt only", async () => {
    // A budget, so the strip shows its two cards rather than the one budget prompt.
    const h = household(
      [...OWNER, { name: "Card", type: "Credit Card", balance: -1200, oct: -1200 }],
      undefined,
      [
        { name: "Salary after tax", category: "income", amount: 2500, isIncome: true },
        { name: "Bills", category: "bills", amount: 300, isEssential: true },
      ],
    );
    const api = fakeApi(
      routes(h, {
        "PATCH /user-profile": (body) => ({
          ...h.profile,
          ...(body as object),
          updatedAt: "2026-11-20T12:05:00.000Z",
        }),
      }),
    );
    const { ui } = withApi(
      <>
        <Home
          onSignOut={jest.fn()}
          onOpenCheckIn={jest.fn()}
          onOpenHistory={jest.fn()}
          onChangeWhatCounts={jest.fn()}
          onAddAccount={jest.fn()}
          onAddEstimate={jest.fn()}
          marketingOrigin="https://m.test.invalid"
          links={{
            setUp: SET_UP,
            addBudget: SET_UP,
            addSpending: SET_UP,
          }}
          now={NOW}
        />
        <SettingsProfile {...props()} />
      </>,
      api.client,
    );
    await render(ui);
    await settle();
    // 310,000 - 186,000 + 3,400 - 1,200 with the home counted; the card's 1,200 is owed.
    expect(within(screen.getByTestId("home-hero")).getByText("£126,200")).toBeOnTheScreen();
    const owed = "What you owe, £1,200, Cards, loans and overdrafts";
    expect(screen.getByLabelText(owed)).toBeOnTheScreen();

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(
        screen.getByRole("switch", { name: "Count property you own, less the mortgage on it" }),
      );
    await settle();

    // 3,400 - 1,200 without the home and its mortgage; the mortgage was never in What you owe.
    expect(within(screen.getByTestId("home-hero")).getByText("£2,200")).toBeOnTheScreen();
    expect(screen.getByLabelText(owed)).toBeOnTheScreen();
  });

  it("a failed save puts the switch back, says so in web's words, and changes nothing", async () => {
    const h = household(OWNER);
    const api = fakeApi(routes(h, { "PATCH /user-profile": () => fail("server", 500) }));
    await profilePage(api);
    await settle();
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(
        screen.getByRole("switch", { name: "Count property you own, less the mortgage on it" }),
      );
    await settle();
    expect(
      screen.getByRole("switch", { name: "Count property you own, less the mortgage on it" }).props
        .accessibilityState.checked,
    ).toBe(true);
    expect(screen.getByTestId("settings-net-worth-error")).toHaveTextContent(
      "We could not save that change. Nothing has changed. Try again.",
    );
    expect(screen.queryByTestId("settings-saved")).toBeNull();
  });

  it("a 412 says it changed somewhere else, reads the profile again and shows the saved value", async () => {
    const h = household(OWNER);
    let reads = 0;
    const api = fakeApi(
      routes(h, {
        "GET /user-profile": () => {
          reads += 1;
          // Switched off on the website after this page read it.
          return { ...h.profile, netWorthCountsProperty: reads === 1 };
        },
        "PATCH /user-profile": () => fail("client", 412, "precondition_failed"),
      }),
    );
    await profilePage(api);
    await settle();
    // The page shows it on; the person turns it off, but the website already did.
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(
        screen.getByRole("switch", { name: "Count property you own, less the mortgage on it" }),
      );
    await settle();
    expect(reads).toBe(2);
    expect(screen.getByTestId("settings-net-worth-error")).toHaveTextContent(
      "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.",
    );
    expect(
      screen.getByRole("switch", { name: "Count property you own, less the mortgage on it" }).props
        .accessibilityState.checked,
    ).toBe(false);
  });

  it("a name saves when the field is left, only when it changed, trimmed", async () => {
    const h = household(OWNER);
    const api = fakeApi(
      routes(h, {
        "PATCH /user-profile": (body) => ({ ...h.profile, ...(body as object) }),
      }),
    );
    await profilePage(api);
    await settle();
    const first = screen.getByLabelText("First name");
    await fireEvent(first, "focus");
    await fireEvent(first, "blur");
    await settle();
    expect(patches(api)).toEqual([]);
    await fireEvent.changeText(first, "  Samira ");
    await fireEvent(first, "blur");
    await settle();
    expect(patches(api).map((c) => c.body)).toEqual([{ firstName: "Samira" }]);
    expect(screen.getByLabelText("First name").props.value).toBe("Samira");
  });

  it("a name submitted with the keyboard, then left, saves once", async () => {
    const h = household(OWNER);
    const api = fakeApi(
      routes(h, {
        "PATCH /user-profile": (body) => ({ ...h.profile, ...(body as object) }),
      }),
    );
    await profilePage(api);
    await settle();
    const first = screen.getByLabelText("First name");
    await fireEvent.changeText(first, "Samira");
    await fireEvent(first, "submitEditing");
    await fireEvent(first, "blur");
    await settle();
    expect(patches(api).map((c) => c.body)).toEqual([{ firstName: "Samira" }]);
    // Typing again is a new edit, which saves again.
    await fireEvent.changeText(screen.getByLabelText("First name"), "Sam");
    await fireEvent(screen.getByLabelText("First name"), "blur");
    await settle();
    expect(patches(api).map((c) => c.body)).toEqual([
      { firstName: "Samira" },
      { firstName: "Sam" },
    ]);
  });

  it("a name that fails to save shows the saved name again", async () => {
    const api = fakeApi(
      routes(household(OWNER), { "PATCH /user-profile": () => fail("unavailable") }),
    );
    await profilePage(api);
    await settle();
    const last = screen.getByLabelText("Last name");
    await fireEvent.changeText(last, "Jones");
    await fireEvent(last, "blur");
    await settle();
    expect(screen.getByLabelText("Last name").props.value).toBe("Taylor");
    expect(screen.getByTestId("settings-details-error")).toHaveTextContent(
      "We could not save that change. Nothing has changed. Try again.",
    );
  });

  it("the check-in day lists the 1st to the 31st with web's hint, and saves the one chosen", async () => {
    const h = household(OWNER);
    const api = fakeApi(
      routes(h, { "PATCH /user-profile": (body) => ({ ...h.profile, ...(body as object) }) }),
    );
    await profilePage(api);
    await settle();
    const radios = within(screen.getByTestId("settings-check-in-day")).getAllByRole("radio");
    expect(radios).toHaveLength(31);
    expect(
      [radios[0], radios[1], radios[2], radios[10], radios[21], radios[30]].map(
        (r) => r?.props.accessibilityLabel,
      ),
    ).toEqual(["1st", "2nd", "3rd", "11th", "22nd", "31st"]);
    // No day chosen reads as the 1st.
    expect(radios[0]?.props.accessibilityState.checked).toBe(true);
    expect(
      screen.getByText(
        "In months with fewer days, the check-in falls on the last day of the month.",
      ),
    ).toBeOnTheScreen();
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole("radio", { name: "12th" }));
    await settle();
    expect(patches(api).map((c) => c.body)).toEqual([{ checkInDay: 12 }]);
    expect(screen.getByRole("radio", { name: "12th" }).props.accessibilityState.checked).toBe(true);
  });

  it("Self Assessment writes the page and section lists, keeping the default pages on", async () => {
    const h = household(OWNER);
    const api = fakeApi(
      routes(h, { "PATCH /user-profile": (body) => ({ ...h.profile, ...(body as object) }) }),
    );
    await profilePage(api);
    await settle();
    const sa = screen.getByRole("switch", { name: "Self Assessment" });
    expect(sa.props.accessibilityState.checked).toBe(false);
    await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(sa);
    await settle();
    const defaults = ["accounts", "budget", "debt", "savings", "pension", "mortgage", "tax"];
    expect(patches(api).map((c) => c.body)).toEqual([
      { enabledPages: defaults, dashboardWidgets: defaults },
    ]);
    expect(
      screen.getByRole("switch", { name: "Self Assessment" }).props.accessibilityState.checked,
    ).toBe(true);
  });

  it("restored offline: says so and sends no request", async () => {
    const api = fakeApi(routes(household(OWNER)));
    await profilePage(api, { offline: true });
    await settle();
    expect(screen.getByText("Try again")).toBeOnTheScreen();
    expect(api.request).not.toHaveBeenCalled();
  });

  it("with no profile yet, the website's setup", async () => {
    const h = household(OWNER);
    await profilePage(fakeApi(routes(h, { "GET /user-profile": () => undefined })));
    await settle();
    expect(screen.getByTestId("not-set-up-open-website")).toBeOnTheScreen();
  });

  it("terms changed: the terms screen in the page", async () => {
    const h = household(OWNER);
    await profilePage(
      fakeApi(
        routes(h, { "GET /user-profile": () => fail("forbidden", 403, "terms_not_accepted") }),
      ),
    );
    await settle();
    expect(screen.getByTestId("terms-open-website")).toBeOnTheScreen();
  });

  it("a failed read says so with Try again, which reads again", async () => {
    const h = household(OWNER);
    let down = true;
    const api = fakeApi(
      routes(h, { "GET /user-profile": () => (down ? fail("server", 503) : h.profile) }),
    );
    await profilePage(api);
    // The query client's own retries come first.
    await act(async () => jest.advanceTimersByTimeAsync(60_000));
    expect(screen.getByTestId("settings-profile-error")).toBeOnTheScreen();
    down = false;
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByTestId("settings-profile-retry"));
    await settle();
    expect(screen.getByLabelText("First name").props.value).toBe("Sam");
  });

  it("an answer it cannot read is out of step, never the connection", async () => {
    const h = household(OWNER);
    await profilePage(fakeApi(routes(h, { "GET /user-profile": () => ({ enabledPages: "tax" }) })));
    await settle();
    expect(screen.getByTestId("settings-profile-error")).toBeOnTheScreen();
    expect(screen.queryByText(/connection/i)).toBeNull();
  });

  it("loading: nothing for 200 ms, then a placeholder", async () => {
    const h = household(OWNER);
    await profilePage(fakeApi(routes(h, { "GET /user-profile": () => new Promise(() => {}) })));
    await act(async () => jest.advanceTimersByTimeAsync(150));
    expect(screen.queryByTestId("settings-profile-loading")).toBeNull();
    await act(async () => jest.advanceTimersByTimeAsync(100));
    expect(screen.getByTestId("settings-profile-loading")).toBeOnTheScreen();
  });

  it("an older backend (no updatedAt, no lists) still shows the page and sends no If-Match", async () => {
    const api = fakeApi({
      "GET /accounts": () => [],
      "GET /user-profile": () => ({ onboardingCompleted: true }),
      "PATCH /user-profile": () => ({}),
    });
    await profilePage(api);
    await settle();
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole("switch", { name: "Self Assessment" }));
    await settle();
    expect(patches(api)).toEqual([
      {
        method: "PATCH",
        path: "/user-profile",
        body: {
          enabledPages: ["accounts", "budget", "debt", "savings", "pension", "mortgage", "tax"],
        },
      },
    ]);
  });

  it("a newer backend (fields it does not know) still shows the page", async () => {
    const h = household(OWNER);
    await profilePage(
      fakeApi(
        routes(h, { "GET /user-profile": () => ({ ...h.profile, fieldFromALaterBackend: "x" }) }),
      ),
    );
    await settle();
    expect(screen.getByLabelText("First name").props.value).toBe("Sam");
  });
});
