import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeCheckInChange, MonthlyBalanceCheckInDrawer } from "./MonthlyBalanceCheckInDrawer";

const mockSubmit = vi.fn();
let fetcherState: { state: "idle" | "submitting" | "loading"; data?: unknown } = {
  state: "idle",
  data: undefined,
};

vi.mock("react-router", () => ({
  useFetcher: () => ({ submit: mockSubmit, ...fetcherState }),
}));

const accounts = [
  { id: "acc-1", name: "Monzo Current", type: "Current", balance: 1200, userId: "u1" },
  { id: "acc-2", name: "Marcus Saver", type: "Saving", balance: 5000, userId: "u1" },
];

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: /60-Sec Balance Check-In/i }));
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: /Save All Current Balances/i }));

describe("MonthlyBalanceCheckInDrawer", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    fetcherState = { state: "idle", data: undefined };
  });

  it("sends ONE request for every account and shows nothing until the server answers", () => {
    const view = render(<MonthlyBalanceCheckInDrawer accounts={accounts as any} />);
    open();
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBe(2);
    fireEvent.change(inputs[0] as HTMLElement, { target: { value: "1500" } });
    save();

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const [payload, options] = mockSubmit.mock.calls[0] as [Record<string, string>, unknown];
    expect(options).toEqual({ method: "post" });
    expect(payload.intent).toBe("checkIn");
    expect(JSON.parse(payload.balances)).toEqual([
      { id: "acc-1", balance: 1500 },
      { id: "acc-2", balance: 5000 },
    ]);

    // Still waiting: no success message, button disabled against double submits.
    fetcherState = { state: "submitting", data: undefined };
    view.rerender(<MonthlyBalanceCheckInDrawer accounts={accounts as any} />);
    expect(screen.queryByText(/Balances Updated Successfully!/i)).toBeNull();
    expect(
      (screen.getByRole("button", { name: /Save All Current Balances/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("shows success and the net worth change only after a 2xx result", () => {
    const view = render(<MonthlyBalanceCheckInDrawer accounts={accounts as any} />);
    open();
    fireEvent.change(screen.getAllByRole("spinbutton")[0] as HTMLElement, {
      target: { value: "1500.5" },
    });
    save();

    fetcherState = { state: "idle", data: { success: true } };
    view.rerender(<MonthlyBalanceCheckInDrawer accounts={accounts as any} />);

    expect(screen.getByText(/Balances Updated Successfully!/i)).toBeTruthy();
    expect(screen.getByText("Net worth up £300.50 since your last update")).toBeTruthy();
  });

  it("shows an error, not success, when the request fails", () => {
    const view = render(<MonthlyBalanceCheckInDrawer accounts={accounts as any} />);
    open();
    save();

    fetcherState = {
      state: "idle",
      data: { success: false, error: "We couldn't reach the server. Please try again." },
    };
    view.rerender(<MonthlyBalanceCheckInDrawer accounts={accounts as any} />);

    expect(screen.queryByText(/Balances Updated Successfully!/i)).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("couldn't reach the server");
    // The form stays so the user can retry.
    expect(screen.getAllByRole("spinbutton").length).toBe(2);
  });

  it("ignores the previous submission's result when saving again", () => {
    fetcherState = { state: "idle", data: { success: true } };
    render(<MonthlyBalanceCheckInDrawer accounts={accounts as any} />);
    open();
    save();
    expect(screen.queryByText(/Balances Updated Successfully!/i)).toBeNull();
  });

  it("does not submit when a balance is blank", () => {
    render(<MonthlyBalanceCheckInDrawer accounts={accounts as any} />);
    open();
    fireEvent.change(screen.getAllByRole("spinbutton")[1] as HTMLElement, {
      target: { value: "" },
    });
    save();
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Marcus Saver");
  });

  it("drawer is named", () => {
    render(<MonthlyBalanceCheckInDrawer accounts={[]} />);
    open();
    expect(
      screen.getByRole("dialog", { name: "60-Second Monthly Balance Check-In" }),
    ).toBeDefined();
  });

  it("renders empty state when no accounts are provided", () => {
    render(<MonthlyBalanceCheckInDrawer accounts={[]} />);
    open();
    expect(screen.getByText(/No accounts found/i)).toBeTruthy();
  });
});

describe("computeCheckInChange", () => {
  const now = { year: 2026, month: 11 };

  it("compares with last month's month-end net worth when every account has history", () => {
    const details = [
      { accountId: "acc-1", year: 2026, month: 10, value: 1000 },
      { accountId: "acc-2", year: 2026, month: 10, value: 4000 },
    ];
    const change = computeCheckInChange(
      accounts as any,
      details,
      { "acc-1": 1500, "acc-2": 5200 },
      now,
    );
    expect(change).toEqual({ delta: 1700, since: "October" });
  });

  it("reports a fall as a negative delta", () => {
    const details = [
      { accountId: "acc-1", year: 2026, month: 10, value: 1000 },
      { accountId: "acc-2", year: 2026, month: 10, value: 6000 },
    ];
    const change = computeCheckInChange(
      accounts as any,
      details,
      { "acc-1": 1000, "acc-2": 5000 },
      now,
    );
    expect(change).toEqual({ delta: -1000, since: "October" });
  });

  it("falls back to the balances before the check-in when history is incomplete", () => {
    const details = [{ accountId: "acc-1", year: 2026, month: 10, value: 1 }];
    const change = computeCheckInChange(
      accounts as any,
      details,
      { "acc-1": 1250, "acc-2": 5000 },
      now,
    );
    expect(change).toEqual({ delta: 50, since: "your last update" });
  });
});
