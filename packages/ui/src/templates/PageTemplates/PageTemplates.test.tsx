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
    const reset = screen.getByRole("button", { name: "Reset to saved figures" });
    expect((reset as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /Smallest balance first/ }));
    expect(outcome.textContent).not.toEqual(before);
    expect((reset as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(reset);
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
    expect(body.className).toContain("[[data-page-shell]_&]:px_0");
    expect(body.closest("[data-page-shell]")?.tagName).toBe("MAIN");
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
    const skeleton = screen.getByRole("status");
    expect(skeleton.getAttribute("aria-busy")).toBe("true");
    expect(within(skeleton).getByText("Loading page")).toBeDefined();
    expect(screen.getAllByTestId("page-skeleton-kpi")).toHaveLength(3);
    expect(screen.getAllByTestId("page-skeleton-card")).toHaveLength(2);
  });

  it("takes a custom label and delay", () => {
    vi.useFakeTimers();
    render(<PageSkeleton delayMs={500} label="Loading your debts" />);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByRole("status")).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByText("Loading your debts")).toBeDefined();
  });

  it("cancels the timer when unmounted before the delay", () => {
    vi.useFakeTimers();
    const { unmount } = render(<PageSkeleton />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
