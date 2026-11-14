import { fireEvent } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { DEFAULT_PROFILE, type UserProfile, userProfileAtom } from "~/hooks/useUserProfile";
import customRender from "~/testUtils/customRender";
import { TakeHomeCalculator } from "./TakeHomeCalculator";

// Mock Recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 400, height: 400 }}>{children}</div>
    ),
  };
});

const withProfile = (overrides: Partial<UserProfile>) => {
  const store = createStore();
  store.set(userProfileAtom, { ...DEFAULT_PROFILE, ...overrides });
  return {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  };
};

describe("<TakeHomeCalculator /> pension method", () => {
  test("never assumes salary sacrifice: net pay when the user has not chosen it", () => {
    const { getByRole, container } = customRender(
      <TakeHomeCalculator initialSalary={32000} onApplyIncrease={vi.fn()} />,
      withProfile({ isSalarySacrifice: false, pensionPercent: 5 }),
    );
    const sacrifice = getByRole("switch", { name: /Salary sacrifice/ }) as HTMLInputElement;
    expect(sacrifice.checked).toBe(false);
    // £32,000, 5% net-pay pension, England: the same £2,107 a month as dashboard and budget.
    expect(container.textContent).toMatch(/£2,10[67]/);
    expect(container.textContent).not.toContain("£2,117");
    expect(container.textContent).not.toContain("Pension (salary sacrifice)");
  });

  test("starts from salary sacrifice when the user saved it", () => {
    const { getByRole } = customRender(
      <TakeHomeCalculator initialSalary={32000} onApplyIncrease={vi.fn()} />,
      withProfile({ isSalarySacrifice: true }),
    );
    expect((getByRole("switch", { name: /Salary sacrifice/ }) as HTMLInputElement).checked).toBe(
      true,
    );
  });
});

describe("<TakeHomeCalculator /> without a salary", () => {
  test.each([
    ["undefined", undefined],
    ["null", null],
    ["zero", 0],
  ])(
    "renders 'Not set' and never an invented salary when initialSalary is %s",
    (_label, salary) => {
      const { container, getAllByText, getAllByRole, getByLabelText, queryByRole } = customRender(
        <TakeHomeCalculator initialSalary={salary} onApplyIncrease={vi.fn()} />,
      );
      expect(getAllByText("Not set").length).toBeGreaterThan(0);
      expect(getByLabelText("Gross salary range slider").getAttribute("aria-valuetext")).toBe(
        "Not set",
      );
      expect(getAllByRole("link", { name: "Add salary" })[0].getAttribute("href")).toBe(
        "/app/profile",
      );
      expect(queryByRole("figure", { name: "Salary allocation" })).toBeNull();
      expect(container.textContent).not.toContain("45,000");
    },
  );
});

describe("<TakeHomeCalculator /> editing the salary", () => {
  test("clearing the pill while typing keeps the results mounted and the field usable", () => {
    const { getByLabelText, getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );
    const pill = getByLabelText("Gross salary input") as HTMLInputElement;

    fireEvent.focus(pill);
    fireEvent.change(pill, { target: { value: "" } });
    expect(pill.value).toBe("");
    fireEvent.blur(pill);
    expect(getByRole("figure", { name: "Salary allocation" })).toBeDefined();

    fireEvent.focus(pill);
    fireEvent.change(pill, { target: { value: "60000" } });
    expect(pill.value).toBe("60000");
    expect(getByRole("figure", { name: "Salary allocation" }).textContent).toContain("£60,000");
  });

  test("setting a salary on an unset calculator reveals the results", () => {
    const { getByLabelText, queryByRole } = customRender(
      <TakeHomeCalculator onApplyIncrease={vi.fn()} />,
    );
    expect(queryByRole("figure", { name: "Salary allocation" })).toBeNull();
    const pill = getByLabelText("Gross salary input") as HTMLInputElement;
    fireEvent.focus(pill);
    fireEvent.change(pill, { target: { value: "50000" } });
    expect(queryByRole("figure", { name: "Salary allocation" })).not.toBeNull();
  });
});

describe("<TakeHomeCalculator />", () => {
  test("renders the hero, the strip and the breakdown for a known salary", () => {
    const { getByRole, getByText, getAllByText } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );
    expect(getByRole("heading", { level: 2, name: "Where you stand" })).toBeDefined();
    expect(getByText("Estimated monthly take-home")).toBeDefined();
    expect(getByRole("table", { name: "Salary deductions breakdown" })).toBeDefined();
    // Gross £45,000 shows in the pill, the donut and the table.
    expect(getAllByText("£45,000").length).toBeGreaterThan(0);
  });

  test("turning salary sacrifice off also switches off passing on employer NI", () => {
    const { getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
      withProfile({ isSalarySacrifice: true }),
    );
    const sacrifice = getByRole("switch", { name: /Salary sacrifice/ }) as HTMLInputElement;
    const employerNi = getByRole("switch", { name: /Pass on employer NI/ }) as HTMLInputElement;
    fireEvent.click(employerNi);
    expect(employerNi.checked).toBe(true);
    fireEvent.click(sacrifice);
    expect(sacrifice.checked).toBe(false);
    expect(employerNi.checked).toBe(false);
    expect(employerNi.disabled).toBe(true);
  });

  test("sends the monthly rise to the forecast action", () => {
    const onApplyIncrease = vi.fn();
    const { getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={onApplyIncrease} />,
    );
    fireEvent.click(getByRole("button", { name: "Model this in the savings forecaster" }));
    expect(onApplyIncrease).toHaveBeenCalledTimes(1);
    expect(onApplyIncrease.mock.calls[0][0]).toBeGreaterThan(0);
  });
});

describe("<TakeHomeCalculator /> saved figures and the illustration", () => {
  const headline = (container: HTMLElement) =>
    container.querySelector('[data-tone="hero"]')?.textContent;

  test("changing an illustration input leaves the headline alone, sends no request, and resets", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container, getByLabelText, getByRole, getByText, queryByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );
    const saved = headline(container);
    expect(saved).toContain("Estimated monthly take-home");
    expect(getByText("Illustration, not saved")).toBeDefined();
    expect(getByText(/Starting from your figures: £45,000 gross salary/)).toBeDefined();
    // Nothing to reset until an input differs from the saved figures.
    expect(
      (getByRole("button", { name: "Reset to saved figures" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.change(getByLabelText("Gross salary range slider"), { target: { value: "90000" } });
    fireEvent.change(getByLabelText("Pension contribution range slider"), {
      target: { value: "12" },
    });
    expect(headline(container)).toBe(saved);
    expect(fetchSpy).not.toHaveBeenCalled();

    fireEvent.click(getByRole("button", { name: "Reset to saved figures" }));
    expect(
      (getByRole("button", { name: "Reset to saved figures" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((getByLabelText("Gross salary input") as HTMLInputElement).value).toBe("£45,000");
    fetchSpy.mockRestore();
  });
});

describe("<TakeHomeCalculator /> estimate labelling and tax year", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("labels take-home as an estimate for the tax year and keeps KPI values out of the heading outline", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
    const { getByText, getAllByRole, queryByText, queryAllByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );

    expect(getByText("Estimate for 2026/27, based on the figures you entered")).toBeDefined();
    // One debounced live region with a short message, not the whole result block.
    expect(getAllByRole("status")).toHaveLength(1);
    // Real 2026/27 rates: no "using older rates" banner.
    expect(queryByText(/Using .* rates/)).toBeNull();
    const headings = queryAllByRole("heading").map((h) => h.textContent);
    expect(headings.some((t) => /£/.test(t ?? ""))).toBe(false);
  });

  test("offers the 2026/27 student loan thresholds, not last year's", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
    const { getByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );
    const options = Array.from(getByRole("combobox").querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options.some((t) => t?.includes("Plan 2") && t.includes("£29,385"))).toBe(true);
    expect(options.some((t) => t?.includes("£28,470"))).toBe(false);
  });

  test("says which rates are used when the calendar is past the latest supported year", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-06-01T12:00:00Z"));
    const { getByText } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );
    expect(getByText(/Using 2026\/27 rates/)).toBeDefined();
    expect(getByText(/^Estimate for 2026\/27/)).toBeDefined();
  });
});

describe("<TakeHomeCalculator /> the next £1,000", () => {
  const openTool = (getByRole: (role: string, opts: { name: string }) => HTMLElement) => {
    const tab = getByRole("tab", { name: "The next £1,000" });
    fireEvent.pointerDown(tab, { button: 0 });
    fireEvent.mouseDown(tab, { button: 0 });
    fireEvent.keyDown(tab, { key: "Enter", code: "Enter" });
  };

  test("switches to the explorer, seeded from the saved salary, and resets with the zone", () => {
    const { container, getByRole, getByLabelText, queryByRole } = customRender(
      <TakeHomeCalculator initialSalary={45000} onApplyIncrease={vi.fn()} />,
    );
    expect(container.querySelector('[data-testid="marginal-rate-explorer"]')).toBeNull();
    openTool(getByRole);
    expect(container.querySelector('[data-testid="marginal-rate-explorer"]')).not.toBeNull();
    expect((getByLabelText("Pay before tax a year input") as HTMLInputElement).value).toBe(
      "£45,000",
    );
    // A real tab panel, labelled by and controlled from its tab.
    const panel = getByRole("tabpanel", { name: "The next £1,000" });
    expect(getByRole("tab", { name: "The next £1,000" }).getAttribute("aria-controls")).toBe(
      panel.id,
    );

    fireEvent.change(getByLabelText("Pay before tax a year range slider"), {
      target: { value: "80000" },
    });
    fireEvent.click(getByRole("button", { name: "Model a pension contribution" }));
    expect((getByLabelText("Pay before tax a year input") as HTMLInputElement).value).toBe(
      "£80,000",
    );
    fireEvent.click(getByRole("button", { name: "Reset to saved figures" }));
    expect(
      (getByRole("button", { name: "Reset to saved figures" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((getByLabelText("Pay before tax a year input") as HTMLInputElement).value).toBe(
      "£45,000",
    );
    expect(getByRole("button", { name: "Model a pension contribution" })).toBeDefined();
  });

  test("with no saved salary the basis line says the example is used", () => {
    const { getByRole, getByText } = customRender(<TakeHomeCalculator onApplyIncrease={vi.fn()} />);
    openTool(getByRole);
    expect(
      getByText("No salary saved, so this uses an example: £39,000 a year before tax"),
    ).toBeDefined();
  });
});
