import { SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CHECK_IN_EMPTY_BALANCE_ERROR,
  CheckInPreview,
  checkInAccountLabel,
  checkInAccountsFor,
  checkInTypeLabel,
} from "./CheckInPreview";

const gbp = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

describe("check-in account labels", () => {
  it("uses sentence case type labels", () => {
    expect(checkInTypeLabel("Current")).toBe("Current account");
    expect(checkInTypeLabel("Saving")).toBe("Savings");
    expect(checkInTypeLabel("Student Loan")).toBe("Student loan");
    expect(checkInTypeLabel("Mortgage")).toBe("Mortgage");
  });

  it("sentence-cases names, keeps acronyms and replaces bank brands with a neutral name", () => {
    expect(checkInAccountLabel("Residential Mortgage", "Mortgage")).toBe("Residential mortgage");
    expect(checkInAccountLabel("Cash ISA", "Saving")).toBe("Cash ISA");
    expect(checkInAccountLabel("Monzo current", "Current")).toBe("Current account");
    expect(checkInAccountLabel("First Direct savings", "Saving")).toBe("Savings");
    // A brand inside another word is not a brand name.
    expect(checkInAccountLabel("Chaser Fund", "Saving")).toBe("Chaser fund");
    expect(checkInAccountLabel("Cash ISA", "Saving")).toBe("Cash ISA");
    expect(checkInAccountLabel("Monzo current", "Current")).toBe("Current account");
  });

  it("takes every account and balance from the sample household fixture", () => {
    for (const household of ["renter", "homeowner"] as const) {
      const fixture = SAMPLE_HOUSEHOLDS[household].fixture.accounts;
      const accounts = checkInAccountsFor(household);
      expect(accounts.map((a) => a.savedBalance)).toEqual(fixture.map((a) => Number(a.balance)));
      expect(accounts.map((a) => a.id)).toEqual(fixture.map((a) => a.id));
    }
  });
});

describe("CheckInPreview", () => {
  const renter = checkInAccountsFor("renter");
  const [first, second] = renter;
  if (!first || !second) throw new Error("renter fixture needs two accounts");

  it("renders the first account and steps with No change and Back", () => {
    render(<CheckInPreview household="renter" id="test-checkin" />);

    expect(screen.getByText(`1 of ${renter.length}`)).toBeDefined();
    expect(screen.getByRole("heading", { name: first.name })).toBeDefined();
    // The neutral name already says the type, so no badge repeats it.
    expect(screen.getAllByText(first.type)).toHaveLength(1);
    expect(screen.getByText(`Saved balance: ${gbp(first.savedBalance)}`)).toBeDefined();
    expect(screen.queryByText(/monzo/i)).toBeNull();

    fireEvent.click(screen.getByTestId("test-checkin-no-change"));
    expect(screen.getByText(`2 of ${renter.length}`)).toBeDefined();
    expect(screen.getByRole("heading", { name: second.name })).toBeDefined();

    fireEvent.click(screen.getByTestId("test-checkin-back"));
    expect(screen.getByRole("heading", { name: first.name })).toBeDefined();
  });

  it("does not save an empty balance as £0", () => {
    render(<CheckInPreview household="renter" id="test-checkin" />);

    fireEvent.change(screen.getByLabelText("New balance"), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("test-checkin-update"));

    expect(screen.getByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeDefined();
    expect(screen.getByText(`1 of ${renter.length}`)).toBeDefined();

    for (let i = 0; i < renter.length; i++) {
      fireEvent.click(screen.getByTestId("test-checkin-no-change"));
    }
    expect(screen.queryByText(/£0\b/)).toBeNull();
    expect(screen.getByText(`${gbp(first.savedBalance)} (confirmed)`)).toBeDefined();
  });

  it("completes the check-in and steps through again", () => {
    render(<CheckInPreview household="renter" id="test-checkin" />);

    expect(screen.queryByText(/to the rest/i)).toBeNull();
    fireEvent.click(screen.getByTestId("test-checkin-update"));
    for (let i = 1; i < renter.length; i++) {
      fireEvent.click(screen.getByTestId("test-checkin-no-change"));
    }

    expect(screen.getByText("Check-in complete for this month")).toBeDefined();
    expect(screen.getByText(`${gbp(first.savedBalance)} (updated)`)).toBeDefined();

    fireEvent.click(screen.getByTestId("test-checkin-reset"));
    expect(screen.getByText(`1 of ${renter.length}`)).toBeDefined();
  });

  it("shows the homeowner mortgage in sentence case with its saved balance", () => {
    const owner = checkInAccountsFor("homeowner");
    const mortgage = owner.find((a) => a.type === "Mortgage");
    if (!mortgage) throw new Error("homeowner fixture needs a mortgage");
    render(<CheckInPreview household="homeowner" id="test-checkin-owner" />);

    for (let i = 0; i < owner.indexOf(mortgage); i++) {
      fireEvent.click(screen.getByTestId("test-checkin-owner-no-change"));
    }

    expect(screen.getByRole("heading", { name: "Residential mortgage" })).toBeDefined();
    expect(screen.getByText(`Saved balance: ${gbp(mortgage.savedBalance)}`)).toBeDefined();
  });
});

describe("check-in labels, edge cases", () => {
  it("finds a two-word brand even when the name has doubled spaces", () => {
    expect(checkInAccountLabel("First  Direct savings", "Saving")).toBe("Savings");
  });

  it("keeps a single capital letter, such as Plan A, as written", () => {
    expect(checkInAccountLabel("Plan A savings", "Saving")).toBe("Plan A savings");
  });

  it("leaves out a fixture account with no id, name or type, or an unreadable balance", () => {
    const accounts = SAMPLE_HOUSEHOLDS.renter.fixture.accounts;
    const before = checkInAccountsFor("renter").length;
    const valid = accounts[0];
    if (!valid) throw new Error("renter fixture needs an account");
    // Each broken copy differs from a valid account in one field only.
    const broken = [
      { ...valid, id: "" },
      { ...valid, id: `no-name-${Date.now()}`, name: "" },
      { ...valid, id: `no-type-${Date.now()}`, type: "" },
      { ...valid, id: `bad-balance-${Date.now()}`, balance: "not a number" },
    ];
    for (const account of broken) {
      accounts.push(account as (typeof accounts)[number]);
      try {
        expect(checkInAccountsFor("renter")).toHaveLength(before);
      } finally {
        accounts.pop();
      }
    }
  });
});

describe("CheckInPreview steps", () => {
  const renter = checkInAccountsFor("renter");
  const owner = checkInAccountsFor("homeowner");
  const [first, second, third] = renter;
  if (!first || !second || !third) throw new Error("renter fixture needs three accounts");

  it("shows no Back button on the first account", () => {
    render(<CheckInPreview household="renter" id="t" />);
    expect(screen.queryByTestId("t-back")).toBeNull();
  });

  it("goes back one account at a time from the third", () => {
    render(<CheckInPreview household="renter" id="t" />);
    fireEvent.click(screen.getByTestId("t-no-change"));
    fireEvent.click(screen.getByTestId("t-no-change"));
    expect(screen.getByRole("heading", { name: third.name })).toBeDefined();
    fireEvent.click(screen.getByTestId("t-back"));
    expect(screen.getByRole("heading", { name: second.name })).toBeDefined();
  });

  it("records a typed balance as an update", () => {
    render(<CheckInPreview household="renter" id="t" />);
    fireEvent.change(screen.getByLabelText("New balance"), { target: { value: "1234" } });
    fireEvent.click(screen.getByTestId("t-update"));
    fireEvent.click(screen.getByTestId("t-no-change"));
    fireEvent.click(screen.getByTestId("t-no-change"));
    expect(screen.getByText(`${gbp(1234)} (updated)`)).toBeDefined();
  });

  it("shows the empty balance message only after Update, and hides it once a figure is typed", () => {
    render(<CheckInPreview household="renter" id="t" />);
    const input = () => screen.getByLabelText("New balance");
    // Clearing the field alone shows nothing.
    fireEvent.change(input(), { target: { value: "" } });
    expect(screen.queryByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeNull();
    fireEvent.click(screen.getByTestId("t-update"));
    expect(screen.getByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeDefined();
    // Typing a figure and clearing it again does not bring the message back before Update.
    fireEvent.change(input(), { target: { value: "5" } });
    expect(screen.queryByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeNull();
    fireEvent.change(input(), { target: { value: "" } });
    expect(screen.queryByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeNull();
  });

  it("keeps the empty balance message while the field holds no readable figure", () => {
    render(<CheckInPreview household="renter" id="t" />);
    const input = () => screen.getByLabelText("New balance");
    fireEvent.change(input(), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("t-update"));
    // A lone minus sign is not a figure yet, so the field is still empty for saving.
    fireEvent.change(input(), { target: { value: "-" } });
    expect(screen.getByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeDefined();
  });

  it("starts each step without the message, after moving on or going back", () => {
    render(<CheckInPreview household="renter" id="t" />);
    const clearField = () =>
      fireEvent.change(screen.getByLabelText("New balance"), { target: { value: "" } });
    const fail = () => {
      clearField();
      fireEvent.click(screen.getByTestId("t-update"));
      expect(screen.getByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeDefined();
    };
    fail();
    fireEvent.click(screen.getByTestId("t-no-change"));
    clearField();
    expect(screen.queryByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeNull();
    fail();
    fireEvent.click(screen.getByTestId("t-back"));
    clearField();
    expect(screen.queryByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeNull();
  });

  it("starts again without the message after stepping through", () => {
    render(<CheckInPreview household="renter" id="t" />);
    fireEvent.click(screen.getByTestId("t-no-change"));
    fireEvent.click(screen.getByTestId("t-no-change"));
    fireEvent.change(screen.getByLabelText("New balance"), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("t-update"));
    expect(screen.getByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeDefined();
    fireEvent.click(screen.getByTestId("t-no-change"));
    fireEvent.click(screen.getByTestId("t-reset"));
    fireEvent.change(screen.getByLabelText("New balance"), { target: { value: "" } });
    expect(screen.queryByText(CHECK_IN_EMPTY_BALANCE_ERROR)).toBeNull();
  });

  it("clears typed figures and recorded steps when stepping through again", () => {
    render(<CheckInPreview household="renter" id="t" />);
    fireEvent.change(screen.getByLabelText("New balance"), { target: { value: "1234" } });
    fireEvent.click(screen.getByTestId("t-update"));
    fireEvent.click(screen.getByTestId("t-no-change"));
    fireEvent.click(screen.getByTestId("t-no-change"));
    fireEvent.click(screen.getByTestId("t-reset"));
    // The first field shows the saved balance again, not the typed 1234.
    expect((screen.getByLabelText("New balance") as HTMLInputElement).value).not.toMatch(/1,?234/);
    for (let i = 0; i < renter.length; i++) fireEvent.click(screen.getByTestId("t-no-change"));
    expect(screen.getByText(`${gbp(first.savedBalance)} (confirmed)`)).toBeDefined();
    expect(screen.queryByText(/\(updated\)/)).toBeNull();
  });

  it("shows the account type beside a name that does not already say it", () => {
    render(<CheckInPreview household="homeowner" id="t" />);
    const cash = owner[0];
    if (!cash || cash.name === cash.type) throw new Error("homeowner fixture changed");
    expect(screen.getByText(cash.type)).toBeDefined();
  });

  it("switches to the other household's accounts when the household changes", () => {
    const { rerender } = render(<CheckInPreview household="renter" id="t" />);
    rerender(<CheckInPreview household="homeowner" id="t" />);
    expect(screen.getByText(`1 of ${owner.length}`)).toBeDefined();
  });

  it("announces each step, the end and a restart", () => {
    vi.useFakeTimers();
    try {
      render(<CheckInPreview household="renter" id="t" />);
      const status = () => screen.getByRole("status").textContent;
      const step = (testId: string) => {
        fireEvent.click(screen.getByTestId(testId));
        act(() => {
          vi.advanceTimersByTime(600);
        });
      };
      // The first message is the live region's silent baseline.
      step("t-no-change");
      step("t-no-change");
      expect(status()).toBe(`Confirmed ${second.name}. Showing ${third.name}.`);
      step("t-no-change");
      expect(status()).toBe("All accounts checked in.");
      step("t-reset");
      expect(status()).toBe("Check-in reset. Showing first account.");
    } finally {
      vi.useRealTimers();
    }
  });
});
