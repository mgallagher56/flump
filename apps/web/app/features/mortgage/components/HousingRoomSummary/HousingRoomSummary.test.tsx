import { figureKnown, figureUnknown, type HousingRoom } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HousingRoomSummary } from "./HousingRoomSummary";

const knownRoomValue: HousingRoom = {
  monthly: 1500,
  takeHomeMonthly: 2600,
  essentialsWithoutHousing: 950,
  debtCommitment: 150,
  plannedSavings: 200,
  otherSpending: 400,
  includeSavings: false,
  includeOtherSpending: false,
  currentHousingMonthly: 900,
  currentHousingKind: "rent",
  currentHousingEstimated: false,
};

const knownRoom = figureKnown<HousingRoom>(knownRoomValue, "derived");

describe("HousingRoomSummary", () => {
  it("shows planned savings, other spending, and current rent", () => {
    render(
      <HousingRoomSummary
        housingRoom={knownRoom}
        includeOtherSpending={false}
        includeSavings={false}
        onIncludeOtherSpendingChange={vi.fn()}
        onIncludeSavingsChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("planned-savings-amount").textContent).toContain("£200 a month");
    expect(screen.getByTestId("other-spending-amount").textContent).toContain("£400 a month");
    expect(screen.getByTestId("current-housing-fact").textContent).toContain("Current rent");
    expect(screen.getByTestId("current-housing-fact").textContent).toContain("£900 a month");
  });

  it("calls toggle handlers when switches change", () => {
    const onSavings = vi.fn();
    const onOther = vi.fn();

    render(
      <HousingRoomSummary
        housingRoom={knownRoom}
        includeOtherSpending={false}
        includeSavings={false}
        onIncludeOtherSpendingChange={onOther}
        onIncludeSavingsChange={onSavings}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Subtract planned savings" }));
    expect(onSavings).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("switch", { name: "Subtract other spending" }));
    expect(onOther).toHaveBeenCalledWith(true);
  });

  it("shows mortgage label and estimate note for an estimated mortgage payment", () => {
    const mortgageRoom = figureKnown<HousingRoom>(
      {
        ...knownRoomValue,
        currentHousingMonthly: 1250,
        currentHousingKind: "mortgage",
        currentHousingEstimated: true,
      },
      "assumption",
    );

    render(
      <HousingRoomSummary
        housingRoom={mortgageRoom}
        includeOtherSpending={false}
        includeSavings={false}
        onIncludeOtherSpendingChange={vi.fn()}
        onIncludeSavingsChange={vi.fn()}
      />,
    );

    const fact = screen.getByTestId("current-housing-fact").textContent ?? "";
    expect(fact).toContain("Current mortgage payment");
    expect(fact).toContain("£1,250 a month (estimate)");
  });

  it("omits current housing fact when none is saved", () => {
    const noHousing = figureKnown<HousingRoom>(
      {
        ...knownRoomValue,
        currentHousingMonthly: null,
        currentHousingKind: null,
      },
      "derived",
    );

    render(
      <HousingRoomSummary
        housingRoom={noHousing}
        includeOtherSpending={false}
        includeSavings={false}
        onIncludeOtherSpendingChange={vi.fn()}
        onIncludeSavingsChange={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("current-housing-fact")).toBeNull();
  });

  it("renders a plain prompt and navigation actions when housing room is unknown", () => {
    const onNavigate = vi.fn();
    render(
      <HousingRoomSummary
        housingRoom={figureUnknown(["annualSalary", "budget"], "not-set")}
        includeOtherSpending={false}
        includeSavings={false}
        onIncludeOtherSpendingChange={vi.fn()}
        onIncludeSavingsChange={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText(/Add your salary in Settings/)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open Settings" }));
    expect(onNavigate).toHaveBeenCalledWith("/app/profile");
    fireEvent.click(screen.getByRole("button", { name: "Open Budget" }));
    expect(onNavigate).toHaveBeenCalledWith("/app/budget");
  });
});
