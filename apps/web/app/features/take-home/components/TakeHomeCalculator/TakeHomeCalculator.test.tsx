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
    // The pay starts at the saved salary, so it waits under "More options".
    fireEvent.click(getByRole("button", { name: "More options" }));
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
