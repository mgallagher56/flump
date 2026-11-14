import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../../patterns/AppShell/AppShell";
import { expectPageRules } from "../../testing";
import {
  DashboardTemplate,
  EmptyTemplate,
  ErrorTemplate,
  FormTemplate,
  formatDuration,
  ListDetailTemplate,
  PageBody,
  PageSkeleton,
  SimulatorTemplate,
} from "./PageTemplates";

describe("PageTemplates", () => {
  it("dashboard keeps to the page rules: one hero, at most 10 figures, no projection notice", () => {
    const { container } = render(<DashboardTemplate />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(() =>
      expectPageRules(container, { maxFigures: 10, maxNotSet: 0, projectionNotices: 0 }),
    ).not.toThrow();
  });

  it("dashboard accounts table has two columns, the type as secondary text under the name", () => {
    render(<DashboardTemplate />);
    const table = screen.getByRole("table", { name: "Your accounts" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Account", "Balance"]);
    const firstRow = within(table).getAllByRole("row")[1] as HTMLElement;
    expect(within(firstRow).getAllByRole("cell")).toHaveLength(2);
    expect(within(firstRow).getByText("Current")).toBeDefined();
  });

  it("dashboard figures all come from the account rows, in whole pounds", () => {
    render(<DashboardTemplate />);
    // 3,240.18 + 14,300 + 22,150 + 61,800 - 1,860.75, shown once, as the hero.
    expect(screen.getAllByText("£99,629")).toHaveLength(1);
    // The pension KPI agrees with the Workplace pension row.
    expect(screen.getAllByText("£61,800")).toHaveLength(2);
    expect(screen.getByRole("table", { name: "Your accounts" })).toBeDefined();
    expect(screen.queryByText(/\.\d\d$/)).toBeNull();
  });

  it("dashboard chart is titled and summarised without repeating the headline", () => {
    render(<DashboardTemplate />);
    const figure = screen.getByRole("figure", { name: "Your net worth this year" });
    expect(within(figure).getByText(/grown every month since January/)).toBeDefined();
    expect(within(figure).queryByText(/£99,629/)).toBeNull();
  });

  it("simulator keeps to the page rules with the one notice in the scenario zone footer", () => {
    const { container } = render(<SimulatorTemplate />);
    expect(() =>
      expectPageRules(container, { maxFigures: 12, maxNotSet: 0, projectionNotices: 1 }),
    ).not.toThrow();
    const footer = screen.getByTestId("scenario-zone-footer");
    expect(footer.querySelector('[data-notice="projection"]')).not.toBeNull();
    // Saved facts sit outside the zone; the hero is never a scenario outcome.
    const zone = screen.getByTestId("scenario-zone");
    expect(zone.querySelector('[data-tone="hero"]')).toBeNull();
    expect(screen.getByRole("region", { name: "Your details" })).toBeDefined();
  });

  it("simulator splits the zone: inputs in the left column, outcome and chart on the right", () => {
    render(<SimulatorTemplate />);
    const zone = screen.getByTestId("scenario-zone");
    const controls = within(zone).getByRole("region", { name: "Your what-if inputs" });
    const results = within(zone).getByRole("region", { name: "Your result" });
    expect(within(controls).getAllByRole("tab")).toHaveLength(2);
    expect(within(results).getByTestId("scenario-outcome")).toBeDefined();
    expect(within(results).getByRole("figure")).toBeDefined();
    // Controls come first in document order, so they sit left from lg and above under lg.
    expect(controls.compareDocumentPosition(results) & 4).toBeTruthy();
  });

  it("simulator shows one tool at a time, with at most 3 inputs", () => {
    render(<SimulatorTemplate />);
    const zone = screen.getByTestId("scenario-zone");
    expect(within(zone).getAllByRole("tab")).toHaveLength(2);
    expect(within(zone).getAllByRole("slider")).toHaveLength(1);
    fireEvent.mouseDown(within(zone).getByRole("tab", { name: "Change a rate" }), { button: 0 });
    expect(within(zone).getByRole("slider", { name: /Credit card interest rate/ })).toBeDefined();
  });

  it("simulator strategy changes the result and reset restores the saved plan", () => {
    render(<SimulatorTemplate />);
    const outcome = screen.getByTestId("scenario-outcome");
    const before = outcome.textContent;
    // Reset shows only once something differs from the saved plan (E16 round 3).
    expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Smallest balance first/ }));
    expect(outcome.textContent).not.toEqual(before);
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(outcome.textContent).toEqual(before);
    expect(screen.getByRole("figure", { name: "How your debt comes down" })).toBeDefined();
  });

  it("form shows no error until Save is pressed, then clears it once a balance is entered", () => {
    render(<FormTemplate />);
    expect(screen.queryByText("Enter a balance, or leave it for later.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save account" }));
    expect(screen.getByText("Enter a balance, or leave it for later.")).toBeDefined();
    const balance = screen.getByRole("textbox", { name: /Current balance/ });
    fireEvent.change(balance, { target: { value: "1200" } });
    fireEvent.blur(balance);
    expect(screen.queryByText("Enter a balance, or leave it for later.")).toBeNull();
  });

  it("list and detail gives each account its own chart", () => {
    render(<ListDetailTemplate />);
    expect(screen.getByRole("figure", { name: "Easy-access saver this year" })).toBeDefined();
    const pension = screen.getByRole("button", { name: /Workplace pension/ });
    fireEvent.click(pension);
    expect(pension.getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("heading", { level: 2, name: "Workplace pension" })).toBeDefined();
    expect(screen.getByRole("figure", { name: "Workplace pension this year" })).toBeDefined();
  });

  it("empty and error states each offer one clear action", () => {
    render(<EmptyTemplate />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add an account" })).toBeDefined();
    render(<ErrorTemplate />);
    expect(screen.getByRole("button", { name: "Back to home" })).toBeDefined();
  });
});

describe("PageBody", () => {
  it("wraps its children in one div and passes attributes through", () => {
    render(
      <PageBody aria-label="Page" data-testid="body">
        <h1>Your money</h1>
      </PageBody>,
    );
    const body = screen.getByTestId("body");
    expect(body.tagName).toBe("DIV");
    expect(body.getAttribute("aria-label")).toBe("Page");
    expect(within(body).getByRole("heading", { level: 1 })).toBeDefined();
    expect(body.className).toContain("max-w_page.max");
  });

  it("supplies its own gutters, and drops them inside a shell that already pads the page", () => {
    render(
      <AppShell items={[]} logo={null}>
        <PageBody data-testid="body">
          <h1>Your money</h1>
        </PageBody>
      </AppShell>,
    );
    const body = screen.getByTestId("body");
    // Standalone gutters (P13 tokens) ...
    expect(body.className).toContain("px_page.gutter.sm");
    // ... switched off under a `data-page-shell` ancestor, which AppShell's main sets.
    expect(body.className).toContain('[[data-page-shell=""]_&]:px_0');
    expect(body.className).toContain('[[data-page-shell=""]_&]:pt_0');
    expect(body.closest("[data-page-shell]")?.getAttribute("data-page-shell")).toBe("");
    expect(body.closest("[data-page-shell]")?.tagName).toBe("MAIN");
  });

  it("inside the apps/web root main adds only what that shell leaves short of P13", () => {
    render(
      <main data-page-shell="web">
        <PageBody data-testid="body">
          <h1>Your money</h1>
        </PageBody>
      </main>,
    );
    const cls = screen.getByTestId("body").className;
    // The shell pads 12/24px sides and 16/24px top; PageBody tops that up to 16/24/40 and 20/32.
    for (const expected of [
      '[[data-page-shell="web"]_&]:px_1',
      '[[data-page-shell="web"]_&]:md:px_0',
      '[[data-page-shell="web"]_&]:lg:px_4',
      '[[data-page-shell="web"]_&]:pt_1',
      '[[data-page-shell="web"]_&]:md:pt_0',
      '[[data-page-shell="web"]_&]:lg:pt_2',
      '[[data-page-shell="web"]_&]:md:mt_-1',
    ]) {
      expect(cls).toContain(expected);
    }
    // The AppShell rule (exact empty value) does not reach the web shell.
    expect(screen.getByTestId("body").closest('[data-page-shell=""]')).toBeNull();
  });
});

describe("formatDuration", () => {
  it("reads short spans in months and long ones in years and months (P8)", () => {
    expect(formatDuration(1)).toBe("1 month");
    expect(formatDuration(23)).toBe("23 months");
    expect(formatDuration(24)).toBe("2 years");
    expect(formatDuration(40)).toBe("3 years 4 months");
    expect(formatDuration(25)).toBe("2 years 1 month");
  });
});

describe("PageSkeleton", () => {
  afterEach(() => vi.useRealTimers());

  it("shows nothing for the first 200ms, then the skeleton", () => {
    vi.useFakeTimers();
    render(<PageSkeleton />);
    expect(screen.queryByTestId("page-skeleton")).toBeNull();
    act(() => vi.advanceTimersByTime(199));
    expect(screen.queryByTestId("page-skeleton")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId("page-skeleton")).toBeDefined();
  });

  it("has a header, a hero block, 3 KPI cards and 2 cards, announced as loading", () => {
    render(<PageSkeleton delayMs={0} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Loading page");
    // aria-busy sits on the skeleton container, never on the live region.
    expect(status.hasAttribute("aria-busy")).toBe(false);
    expect(screen.getByTestId("page-skeleton").getAttribute("aria-busy")).toBe("true");
    expect(screen.getByTestId("page-skeleton").id).toBe("page-skeleton");
    expect(status.id).toBe("page-skeleton-status");
    expect(screen.getAllByTestId("page-skeleton-kpi")).toHaveLength(3);
    expect(screen.getAllByTestId("page-skeleton-card")).toHaveLength(2);
  });

  it("keeps an empty status region mounted, and fills it after the delay", () => {
    vi.useFakeTimers();
    render(<PageSkeleton delayMs={500} label="Loading your debts" />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    act(() => vi.advanceTimersByTime(300));
    expect(status.textContent).toBe("");
    act(() => vi.advanceTimersByTime(200));
    // The same element, so the change is announced as a live-region update.
    expect(screen.getByRole("status")).toBe(status);
    expect(status.textContent).toBe("Loading your debts");
  });

  it("cancels the timer when unmounted before the delay", () => {
    vi.useFakeTimers();
    const { unmount } = render(<PageSkeleton />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
