import { SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

    fireEvent.click(screen.getByTestId("test-checkin-no-change-rest"));
    expect(screen.queryByText(/£0\b/)).toBeNull();
    expect(screen.getByText(`${gbp(first.savedBalance)} (confirmed)`)).toBeDefined();
  });

  it("completes the check-in and steps through again", () => {
    render(<CheckInPreview household="renter" id="test-checkin" />);

    fireEvent.click(screen.getByTestId("test-checkin-update"));
    fireEvent.click(screen.getByTestId("test-checkin-no-change-rest"));

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
