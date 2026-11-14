import { figureKnown, figureUnknown, type HousingCost } from "@flump/finance-engine";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  HousingCostCard,
  MORTGAGE_MISSING_TEXT,
  RENT_MISSING_TEXT,
  SALARY_MISSING_TEXT,
} from "./HousingCostCard";

const rent = figureKnown<HousingCost>(
  { kind: "rent", monthly: 900, takeHomeMonthly: 2700, sharePct: 33.3, paymentEstimated: false },
  "user",
);
const estimate = figureKnown<HousingCost>(
  {
    kind: "mortgage",
    monthly: 1111.66,
    takeHomeMonthly: 3200,
    sharePct: 34.7,
    paymentEstimated: true,
  },
  "assumption",
  ["Repayment mortgage at your saved rate."],
);

describe("<HousingCostCard />", () => {
  it("shows the saved rent and its share, with tabular figures and no status colour", () => {
    render(<HousingCostCard housingCost={rent} />);
    expect(screen.getByRole("heading", { name: "Housing cost" })).toBeDefined();
    expect(screen.getByText("Monthly rent")).toBeDefined();
    expect(screen.getByTestId("housing-cost-monthly").textContent).toBe("£900");
    const share = screen.getByTestId("housing-cost-share");
    expect(share.textContent).toBe("33.3% of your estimated take-home pay");
    expect(share.className).not.toMatch(/status/);
    expect(screen.getByText("From your saved details.")).toBeDefined();
  });

  it("labels an estimated mortgage payment as an estimate", () => {
    render(<HousingCostCard housingCost={estimate} />);
    expect(screen.getByText("Monthly mortgage payment (estimate)")).toBeDefined();
    expect(screen.getByTestId("housing-cost-monthly").textContent).toBe("£1,111.66");
    expect(
      screen.getByText("Estimate based on a repayment mortgage at your saved rate."),
    ).toBeDefined();
  });

  it("says what is missing instead of showing 0", () => {
    const { rerender } = render(
      <HousingCostCard housingCost={figureUnknown(["monthlyHousingCost"], "not-set")} />,
    );
    expect(screen.getByText(RENT_MISSING_TEXT)).toBeDefined();
    rerender(<HousingCostCard housingCost={figureUnknown(["mortgageDetails"], "not-set")} />);
    expect(screen.getByText(MORTGAGE_MISSING_TEXT)).toBeDefined();
    rerender(<HousingCostCard housingCost={figureUnknown(["annualSalary"], "not-set")} />);
    expect(screen.getByText(SALARY_MISSING_TEXT)).toBeDefined();
    expect(screen.queryByText(/£0|0%/)).toBeNull();
  });

  it("shows the fixed rate end as a fact, singular and plural, and once ended", () => {
    const { rerender } = render(
      <HousingCostCard
        fixedRateEnd={{ date: "2027-05-14", monthsRemaining: 6, ended: false }}
        housingCost={estimate}
      />,
    );
    expect(screen.getByText("Fixed rate ends")).toBeDefined();
    expect(screen.getByTestId("housing-fix-end").textContent).toBe(
      "Fixed rate ends on 14 May 2027. 6 months remaining.",
    );
    rerender(
      <HousingCostCard
        fixedRateEnd={{ date: "2026-12-20", monthsRemaining: 1, ended: false }}
        housingCost={estimate}
      />,
    );
    expect(screen.getByTestId("housing-fix-end").textContent).toMatch(/1 month remaining\.$/);
    rerender(
      <HousingCostCard
        fixedRateEnd={{ date: "2026-10-01", monthsRemaining: 0, ended: true }}
        housingCost={estimate}
      />,
    );
    expect(screen.getByTestId("housing-fix-end").textContent).toBe(
      "Fixed rate ended on 1 October 2026.",
    );
  });

  it("saves the monthly rent when a rent field is offered", async () => {
    const onSaveRent = vi.fn().mockResolvedValue(undefined);
    render(
      <HousingCostCard
        housingCost={figureUnknown(["housingStatus"], "not-set")}
        onSaveRent={onSaveRent}
      />,
    );
    const save = screen.getByRole("button", { name: "Save rent" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Monthly rent"), { target: { value: "950" } });
    fireEvent.click(save);
    await waitFor(() => expect(onSaveRent).toHaveBeenCalledWith(950));
  });

  it("shows an error when saving fails", async () => {
    const onSaveRent = vi.fn().mockRejectedValue(new Error("nope"));
    render(<HousingCostCard housingCost={rent} savedRent={900} onSaveRent={onSaveRent} />);
    fireEvent.click(screen.getByRole("button", { name: "Save rent" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toBe(
      "Could not save your rent. Please try again.",
    );
  });

  it("offers no rent field for a mortgage", () => {
    render(<HousingCostCard housingCost={estimate} onSaveRent={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Save rent" })).toBeNull();
  });
});
