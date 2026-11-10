import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PromoCliffTracker } from "./PromoCliffTracker";

describe("PromoCliffTracker Feature Component", () => {
  it("renders promotional cliff warning for expiring cards", () => {
    const alerts = [
      {
        debtId: "d1",
        debtName: "Virgin Money 0% Balance Transfer",
        promoExpiryDate: "15 Oct 2025",
        projectedBalanceAtExpiryGbp: 1850,
        revertApr: 29.9,
        requiredMonthlyToClearBeforeCliff: 154,
      },
    ];

    render(<PromoCliffTracker alerts={alerts} />);
    expect(screen.getByText("0% Promotional Balance Expiry Warning")).toBeDefined();
    expect(screen.getByText(/Virgin Money 0% Balance Transfer/)).toBeDefined();
  });
});
