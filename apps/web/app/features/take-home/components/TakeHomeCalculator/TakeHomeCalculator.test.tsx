import { findFigures } from "@repo/ui/testing";
import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_PROFILE, type UserProfile } from "~/hooks/useUserProfile";
import { withRootLoader } from "~/test/rootLoaderRouter";
import customRender from "~/testUtils/customRender";
import { TakeHomeCalculator } from "./TakeHomeCalculator";

// The real router: the saved profile is the root loader's (audit slice 8), and links render as links.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const scenarioSpy = vi.hoisted(() => vi.fn());
vi.mock("../NextPoundExplorer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../NextPoundExplorer")>();
  return {
    ...actual,
    useNextPoundScenario: (args: Parameters<typeof actual.useNextPoundScenario>[0]) => {
      scenarioSpy(args);
      return actual.useNextPoundScenario(args);
    },
  };
});

const SAVED: Partial<UserProfile> = {
  employmentType: "employed",
  pensionPercent: 5,
  isSalarySacrifice: false,
};

/** The saved profile, from the root loader's data (audit slice 8). */
const withProfile = (overrides: Partial<UserProfile> = {}) => ({
  wrapper: withRootLoader({ userProfile: { ...DEFAULT_PROFILE, ...SAVED, ...overrides } }),
});

const hero = (container: HTMLElement) => container.querySelector('[data-tone="hero"]');

const openTool = (getByRole: (role: string, opts: { name: string }) => HTMLElement) => {
  const tab = getByRole("tab", { name: "The next £1,000" });
  fireEvent.pointerDown(tab, { button: 0 });
  fireEvent.mouseDown(tab, { button: 0 });
  fireEvent.keyDown(tab, { key: "Enter", code: "Enter" });
};

describe("<TakeHomeCalculator /> saved figures", () => {
  afterEach(() => vi.useRealTimers());

  test("the hero is the take-home estimate, labelled inside the hero; the strip is pay before tax and what comes off", () => {
    const { container } = customRender(
      <TakeHomeCalculator initialSalary={32000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    const heroText = hero(container)?.textContent ?? "";
    // The hero no longer leads with the saved salary (owner ruling 2026-11-15).
    expect(heroText).not.toContain("Salary before tax");
    expect(heroText).not.toContain("£32,000");
    // £32,000, 5% net-pay pension, England: the same figure dashboard and budget show.
    expect(heroText).toMatch(/Monthly take-home pay.*£2,10[67]/);
    // The estimate is named inside the hero itself, once.
    expect(hero(container)?.querySelector("[data-estimate-label]")?.textContent).toBe(
      "Unverified estimate",
    );
    expect(container.querySelectorAll("[data-estimate-label]")).toHaveLength(1);
    const values = [...container.querySelectorAll("[data-kpi-value]")].map((el) =>
      Number((el.textContent ?? "").replace(/[£,]/g, "")),
    );
    expect(values).toHaveLength(3);
    // Monthly pay before tax (£2,667) less tax and NI and pension is the hero's take-home.
    const takeHome = Number(/£([\d,]+)/.exec(heroText)?.[1]?.replace(/,/g, ""));
    expect(values[0]).toBe(2667);
    expect((values[0] ?? 0) - (values[1] ?? 0) - (values[2] ?? 0)).toBe(takeHome);
    expect(container.textContent).not.toMatch(/£[\d,]+\.\d{2}/);
  });

  test("includes the saved student loan in the third KPI and as its own row", () => {
    const { container, getAllByText, getByRole, getByText } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile({ studentLoanPlans: ["PLAN_2"] } as Partial<UserProfile>),
    );
    // Once, as the third KPI: no bar repeats it, and no caption repeats the label.
    expect(getAllByText("Pension and student loan")).toHaveLength(1);
    expect(getByText("After tax and deductions")).toBeDefined();
    expect(container.textContent).not.toContain("Comes off your pay each month");
    expect(container.querySelectorAll("[data-kpi-value]").length).toBe(3);
    fireEvent.click(getByRole("button", { name: "Show details" }));
    expect(getByRole("rowheader", { name: "Student loan" })).toBeDefined();
  });

  test("starts from salary sacrifice only when the user saved it", () => {
    const net = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    const netText = net.container.textContent;
    net.unmount();
    const sacrifice = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      // A changed employer rate marks the method as the user's own choice (not the legacy default).
      withProfile({ isSalarySacrifice: true, pensionEmployerPercent: 4 }),
    );
    expect(sacrifice.container.textContent).not.toBe(netText);
  });

  test("the explorer starts without salary sacrifice for a self-employed user, as the KPI does", () => {
    scenarioSpy.mockClear();
    customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile({
        employmentType: "self-employed",
        isSalarySacrifice: true,
        pensionEmployerPercent: 4,
      }),
    );
    expect(scenarioSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ isSalarySacrifice: false }),
    );
  });

  test("says which rates are used when the calendar is past the latest supported year", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2028-06-01T12:00:00Z"));
    const { getByText, getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    expect(getByText(/Using 2027\/28 rates/)).toBeDefined();
    fireEvent.click(getByRole("button", { name: "Show details" }));
    expect(getByText(/^Estimate for 2027\/28/)).toBeDefined();
  });
});

describe("<TakeHomeCalculator /> empty states", () => {
  test.each([
    ["undefined", undefined],
    ["null", null],
    ["zero", 0],
  ])("with no saved salary (%s) shows one prompt and one button, never £0", (_l, salary) => {
    const { container, getByRole, queryByRole } = customRender(
      <TakeHomeCalculator initialSalary={salary} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    expect(getByRole("link", { name: "Add salary" }).getAttribute("href")).toBe(
      "/app/profile#settings-age-and-pay",
    );
    expect(hero(container)).toBeNull();
    expect(queryByRole("tab")).toBeNull();
    expect(findFigures(container)).toHaveLength(0);
  });

  test("names the missing facts when only the pension details are unanswered", () => {
    const { container, getByText, getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile({ pensionPercent: null as unknown as number }),
    );
    // The hero's own prompt names what to add; the saved salary shows beneath, never as a hero.
    expect(
      getByText("Add your pension contribution to see an estimate of your take-home pay."),
    ).toBeDefined();
    expect(getByRole("link", { name: "Add your details" })).toBeDefined();
    expect(getByText("Salary before tax")).toBeDefined();
    expect(hero(container)).toBeNull();
  });
});

const ZONE_SHOW = "Show what-if: change your pay";
/** The zone starts closed below the saved figures. */
const openZone = (getByRole: (role: string, opts: { name: string }) => HTMLElement) =>
  fireEvent.click(getByRole("button", { name: ZONE_SHOW }));

describe("<TakeHomeCalculator /> the scenario zone", () => {
  test("starts closed with the saved salary and take-home, then the last illustration", () => {
    const { container, getByLabelText, getByRole, queryByLabelText } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    const summary = () => container.querySelector('[data-testid="scenario-zone-summary"]');
    const toggle = getByRole("button", { name: ZONE_SHOW });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(queryByLabelText("Pay rise a year, before tax")).toBeNull();
    expect(container.querySelectorAll('[data-notice="projection"]')).toHaveLength(0);
    // The take-home figure stays in the hero alone (one headline figure), so the summary names
    // the salary and points at it.
    expect(summary()?.textContent).toBe(
      "Starts from your saved salary of £45,000 a year and your take-home pay above.",
    );
    fireEvent.click(toggle);
    fireEvent.change(getByLabelText("Pay rise a year, before tax"), {
      target: { value: "10000" },
    });
    fireEvent.click(getByRole("button", { name: "Hide what-if" }));
    expect(summary()?.textContent).toMatch(
      /^Your illustration: a £10,000 pay rise adds an estimated £[\d,]+ a month to your take-home pay\.$/,
    );
  });

  test("a pay rise changes the outcome, never the headline, sends no request, and resets", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container, getByLabelText, getByRole, getByText, queryByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    openZone(getByRole);
    const saved = hero(container)?.textContent;
    const reset = () => getByRole("button", { name: "Reset to saved figures" });
    expect(getByText("Illustration, not saved")).toBeDefined();
    expect(queryByRole("button", { name: "Reset to saved figures" })).toBeNull();

    const input = getByLabelText("Pay rise a year, before tax") as HTMLInputElement;
    expect(input.type).not.toBe("number");
    fireEvent.change(input, { target: { value: "10000" } });
    expect(hero(container)?.textContent).toBe(saved);
    expect(reset()).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();

    fireEvent.click(reset());
    expect(queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
    fetchSpy.mockRestore();
  });

  test("sends the monthly change to savings", () => {
    const onApplyIncrease = vi.fn();
    const { getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={onApplyIncrease} />,
      withProfile(),
    );
    openZone(getByRole);
    fireEvent.click(getByRole("button", { name: "Model this in savings" }));
    expect(onApplyIncrease.mock.calls[0][0]).toBeGreaterThan(0);
  });

  test("switches to the next £1,000, seeded from the saved salary, and resets with the zone", () => {
    const { container, getByRole, getByLabelText } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    openZone(getByRole);
    expect(container.querySelector('[data-testid="marginal-rate-explorer"]')).toBeNull();
    openTool(getByRole);
    expect(container.querySelector('[data-testid="marginal-rate-explorer"]')).not.toBeNull();
    // The pay starts at the saved salary, so it waits under "Salary and deduction options".
    fireEvent.click(getByRole("button", { name: "Salary and deduction options" }));
    const pay = () => getByLabelText("Pay before tax a year input") as HTMLInputElement;
    expect(pay().value).toBe("£45,000");
    fireEvent.change(getByLabelText("Pay before tax a year"), {
      target: { value: "80000" },
    });
    expect(pay().value).toBe("£80,000");
    fireEvent.click(getByRole("button", { name: "Reset to saved figures" }));
    expect(pay().value).toBe("£45,000");
  });

  test("shows the 'Unverified estimate' sentence once, in the zone's one notice, in either tab", () => {
    const { container, getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    const count = () =>
      (container.textContent?.match(/These tax figures have not yet been checked/g) ?? []).length;
    openZone(getByRole);
    expect(container.querySelectorAll('[data-notice="projection"]')).toHaveLength(1);
    expect(count()).toBe(1);
    openTool(getByRole);
    expect(container.querySelectorAll('[data-notice="projection"]')).toHaveLength(1);
    expect(count()).toBe(1);
  });
});

describe("<TakeHomeCalculator /> typed take-home", () => {
  test("shows the typed take-home as entered, the parts as one prompt to add salary, and no pay-rise what-if", () => {
    const { container, getByRole, getByText, queryByRole, queryByText } = customRender(
      <TakeHomeCalculator initialSalary={null} onApplyIncrease={vi.fn()} />,
      withProfile({ annualSalary: null, monthlyTakeHome: 2500 }),
    );
    const heroText = hero(container)?.textContent ?? "";
    // Typed net pay is the take-home itself (owner decision 2 option A): £2,500 a month.
    expect(heroText).toContain("Monthly take-home pay");
    expect(heroText).toContain("£2,500");
    expect(heroText).toContain("The take-home pay you entered");
    // It is the user's own figure, not an estimate.
    expect(container.querySelector("[data-estimate-label]")).toBeNull();
    expect(getByText("Add your salary before tax to see what comes off your pay")).toBeDefined();
    expect(getByRole("link", { name: "Add salary" }).getAttribute("href")).toBe(
      "/app/profile#settings-age-and-pay",
    );
    expect(queryByRole("button", { name: "Show what-if: change your pay" })).toBeNull();
    expect(queryByText(/£0\b/)).toBeNull();
  });

  test("a saved salary always wins over a typed take-home", () => {
    const { container } = customRender(
      <TakeHomeCalculator initialSalary={32000} onApplyIncrease={vi.fn()} />,
      withProfile({ monthlyTakeHome: 2500 }),
    );
    const heroText = hero(container)?.textContent ?? "";
    expect(heroText).not.toContain("The take-home pay you entered");
    expect(heroText).not.toContain("£2,500");
  });
});

describe("<TakeHomeCalculator /> in 2027/28 (refused rates)", () => {
  afterEach(() => vi.useRealTimers());
  const in2027 = () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-05-01T12:00:00Z"));
  };

  test("a Scottish taxpayer sees the refusal line in the hero, not a figure, and the salary still shows", () => {
    in2027();
    const { container } = customRender(
      <TakeHomeCalculator initialSalary={40000} onApplyIncrease={vi.fn()} />,
      withProfile({ taxRegion: "SCOTLAND" }),
    );
    expect(container.textContent).toContain(
      "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
    );
    expect(container.querySelector("[data-estimate-label]")).toBeNull();
    // The saved salary still shows beneath.
    expect(container.textContent).toContain("£40,000");
  });

  test("a Plan 1 loan is left out and the hero says so", () => {
    in2027();
    const { container } = customRender(
      <TakeHomeCalculator initialSalary={40000} onApplyIncrease={vi.fn()} />,
      withProfile({ taxRegion: "ENGLAND", studentLoanPlans: ["PLAN_1"] }),
    );
    expect(hero(container)?.textContent).toContain(
      "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.",
    );
  });
});
