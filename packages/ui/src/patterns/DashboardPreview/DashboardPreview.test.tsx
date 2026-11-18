import { buildFinancialPicture, SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { breathingRoomPhrase } from "../BreathingRoomPreview/BreathingRoomPreview.wording";
import { DashboardPreview } from "./DashboardPreview";

const gbp = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

const pictureOf = (household: "renter" | "homeowner") => {
  const picture = buildFinancialPicture(SAMPLE_HOUSEHOLDS[household].fixture);
  if (picture.budget.status !== "known" || picture.monthsOfCover.status !== "known") {
    throw new Error("sample household budget and cover must be known");
  }
  return { picture, budget: picture.budget.value, cover: picture.monthsOfCover.value };
};

describe("DashboardPreview", () => {
  it("renders the renter's figures from the engine, each once", () => {
    const { picture, budget, cover } = pictureOf("renter");
    const { container } = render(<DashboardPreview household="renter" id="dash" />);

    expect(screen.getByText("Net worth")).toBeDefined();
    expect(screen.getAllByText(gbp(picture.netWorth.netWorth))).toHaveLength(1);
    expect(
      within(screen.getByTestId("dash-section-accounts")).getByText(
        String(SAMPLE_HOUSEHOLDS.renter.fixture.accounts.length),
      ),
    ).toBeDefined();

    const kpis = within(screen.getByTestId("dash-kpis"));
    expect(kpis.getByText("Left over each month")).toBeDefined();
    expect(kpis.getByText(gbp(budget.surplus))).toBeDefined();
    expect(kpis.getByText("What you owe")).toBeDefined();
    expect(kpis.getByText(gbp(picture.debt.studentLoans))).toBeDefined();

    const budgetCard = within(screen.getByTestId("dash-section-budget"));
    expect(budgetCard.getByText("Spending each month")).toBeDefined();
    expect(budgetCard.getByText(gbp(budget.outgoings))).toBeDefined();
    expect(
      budgetCard.getByText(`Breathing room: ${breathingRoomPhrase(cover.months)}`),
    ).toBeDefined();

    // "Left over each month" appears once: the Budget card no longer repeats it.
    expect(screen.getAllByText("Left over each month")).toHaveLength(1);
    expect(screen.getAllByText(gbp(budget.surplus))).toHaveLength(1);
    expect(screen.queryByTestId("dash-section-mortgage")).toBeNull();
    expect(container.querySelector('[data-kpi-strip="empty"]')).toBeNull();
  });

  it("renders the homeowner's figures from the engine, with the mortgage as its own card", () => {
    const { picture, budget, cover } = pictureOf("homeowner");
    render(<DashboardPreview household="homeowner" id="dash-owner" />);

    expect(screen.getByText("Net worth, including your home estimate")).toBeDefined();
    expect(screen.getByText(gbp(picture.netWorth.netWorth))).toBeDefined();

    const kpis = within(screen.getByTestId("dash-owner-kpis"));
    expect(kpis.getByText(gbp(budget.surplus))).toBeDefined();
    expect(kpis.getByText("Pension pots")).toBeDefined();
    expect(kpis.getByText(gbp(picture.netWorth.pensions))).toBeDefined();
    expect(kpis.queryByText("What you owe")).toBeNull();

    const mortgage = within(screen.getByTestId("dash-owner-section-mortgage"));
    expect(mortgage.getByText(gbp(picture.debt.mortgage))).toBeDefined();
    expect(mortgage.getByText("60% loan to value")).toBeDefined();

    expect(
      within(screen.getByTestId("dash-owner-section-budget")).getByText(
        `Breathing room: ${breathingRoomPhrase(cover.months)}`,
      ),
    ).toBeDefined();
    expect(screen.getAllByText(gbp(picture.netWorth.pensions))).toHaveLength(1);
  });
});
