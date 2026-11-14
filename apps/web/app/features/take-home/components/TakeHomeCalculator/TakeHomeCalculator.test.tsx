import { findFigures } from "@repo/ui/testing";
import { fireEvent } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_PROFILE, type UserProfile, userProfileAtom } from "~/hooks/useUserProfile";
import customRender from "~/testUtils/customRender";
import { TakeHomeCalculator } from "./TakeHomeCalculator";

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

const withProfile = (overrides: Partial<UserProfile> = {}) => {
  const store = createStore();
  store.set(userProfileAtom, { ...DEFAULT_PROFILE, ...SAVED, ...overrides } as UserProfile);
  return {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  };
};

const hero = (container: HTMLElement) => container.querySelector('[data-tone="hero"]');

const openTool = (getByRole: (role: string, opts: { name: string }) => HTMLElement) => {
  const tab = getByRole("tab", { name: "The next £1,000" });
  fireEvent.pointerDown(tab, { button: 0 });
  fireEvent.mouseDown(tab, { button: 0 });
  fireEvent.keyDown(tab, { key: "Enter", code: "Enter" });
};

describe("<TakeHomeCalculator /> saved figures", () => {
  afterEach(() => vi.useRealTimers());

  test("the hero is the saved salary alone; take-home is the first of three KPIs, tagged Estimate", () => {
    const { container, getByText } = customRender(
      <TakeHomeCalculator initialSalary={32000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    const heroText = hero(container)?.textContent ?? "";
    expect(heroText).toContain("Salary before tax");
    expect(heroText).toContain("£32,000");
    // No monthly sub-line: the strip splits the monthly pay, and it would be a fifth figure.
    expect(heroText).not.toMatch(/a month/);
    expect(heroText).not.toMatch(/Estimate/);
    expect(getByText("Estimate")).toBeDefined();
    // £32,000, 5% net-pay pension, England: the same figure dashboard and budget show.
    expect(container.textContent).toMatch(/Monthly take-home pay.*£2,10[67]/);
    const labels = [...container.querySelectorAll("[data-kpi-value]")].length;
    expect(labels).toBe(3);
    // Take-home, tax and NI, and pension add up to the monthly pay before tax (£2,667).
    const values = [...container.querySelectorAll("[data-kpi-value]")].map((el) =>
      Number((el.textContent ?? "").replace(/[£,]/g, "")),
    );
    expect(values.reduce((a, b) => a + b, 0)).toBe(2667);
    expect(container.textContent).not.toMatch(/£[\d,]+\.\d{2}/);
  });

  test("includes the saved student loan in the third KPI and as its own row", () => {
    const { container, getAllByText, getByRole, getByText } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile({ studentLoanPlans: ["PLAN_2"] } as Partial<UserProfile>),
    );
    // Once as the third KPI, once under its bar segment.
    expect(getAllByText("Pension and student loan")).toHaveLength(2);
    expect(getByText("After tax, National Insurance, pension and student loan")).toBeDefined();
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
    vi.setSystemTime(new Date("2027-06-01T12:00:00Z"));
    const { getByText, getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    expect(getByText(/Using 2026\/27 rates/)).toBeDefined();
    fireEvent.click(getByRole("button", { name: "Show details" }));
    expect(getByText(/^Estimate for 2026\/27/)).toBeDefined();
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
    expect(getByRole("link", { name: "Add salary" }).getAttribute("href")).toBe("/app/profile");
    expect(hero(container)).toBeNull();
    expect(queryByRole("tab")).toBeNull();
    expect(findFigures(container)).toHaveLength(0);
  });

  test("names the missing facts when only the pension details are unanswered", () => {
    const { getByText, getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile({ pensionPercent: null as unknown as number }),
    );
    expect(
      getByText("Add your pension contribution to see an estimate of your take-home pay"),
    ).toBeDefined();
    expect(getByRole("link", { name: "Add your details" })).toBeDefined();
  });
});

describe("<TakeHomeCalculator /> the scenario zone", () => {
  test("a pay rise changes the outcome, never the headline, sends no request, and resets", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container, getByLabelText, getByRole, getByText, queryByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
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
    fireEvent.click(getByRole("button", { name: "Model this in savings" }));
    expect(onApplyIncrease.mock.calls[0][0]).toBeGreaterThan(0);
  });

  test("switches to the next £1,000, seeded from the saved salary, and resets with the zone", () => {
    const { container, getByRole, getByLabelText } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile(),
    );
    expect(container.querySelector('[data-testid="marginal-rate-explorer"]')).toBeNull();
    openTool(getByRole);
    expect(container.querySelector('[data-testid="marginal-rate-explorer"]')).not.toBeNull();
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
    expect(container.querySelectorAll('[data-notice="projection"]')).toHaveLength(1);
    expect(count()).toBe(1);
    openTool(getByRole);
    expect(container.querySelectorAll('[data-notice="projection"]')).toHaveLength(1);
    expect(count()).toBe(1);
  });
});
