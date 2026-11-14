import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DashboardTemplate,
  EmptyTemplate,
  ErrorTemplate,
  FormTemplate,
  ListDetailTemplate,
  PageBody,
  PageSkeleton,
  SimulatorTemplate,
} from "./PageTemplates";

describe("PageTemplates", () => {
  it("dashboard figures all come from the account rows", () => {
    render(<DashboardTemplate />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    // 3,240.18 + 14,300 + 22,150 + 61,800 - 1,860.75
    expect(screen.getAllByText("£99,629.43").length).toBeGreaterThan(0);
    // The pension KPI agrees with the Workplace pension row (both read £61,800.00).
    expect(screen.getAllByText("£61,800.00")).toHaveLength(2);
    expect(screen.getByRole("table", { name: "Your accounts" })).toBeDefined();
  });

  it("dashboard chart is titled, summarised and labelled as sample data", () => {
    render(<DashboardTemplate />);
    const figure = screen.getByRole("figure", {
      name: "Your net worth over the past year (sample data)",
    });
    expect(within(figure).getByText(/Sample data\./)).toBeDefined();
    expect(within(figure).getByText(/goes from .* at the start \(January\)/)).toBeDefined();
  });

  it("simulator strategy changes the engine result", () => {
    render(<SimulatorTemplate />);
    const before = screen.getAllByText(/£[\d,]+/).map((n) => n.textContent);
    fireEvent.click(screen.getByRole("radio", { name: /Snowball/ }));
    expect((screen.getByRole("radio", { name: /Snowball/ }) as HTMLInputElement).checked).toBe(
      true,
    );
    const after = screen.getAllByText(/£[\d,]+/).map((n) => n.textContent);
    expect(after).not.toEqual(before);
    expect(
      screen.getByRole("figure", { name: "How your debt falls (sample debts)" }),
    ).toBeDefined();
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
    expect(screen.getByRole("figure", { name: "Easy-access saver (sample data)" })).toBeDefined();
    const pension = screen.getByRole("button", { name: /Workplace pension/ });
    fireEvent.click(pension);
    expect(pension.getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("heading", { level: 2, name: "Workplace pension" })).toBeDefined();
    expect(screen.getByRole("figure", { name: "Workplace pension (sample data)" })).toBeDefined();
  });

  it("empty and error states each offer one clear action", () => {
    render(<EmptyTemplate />);
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
