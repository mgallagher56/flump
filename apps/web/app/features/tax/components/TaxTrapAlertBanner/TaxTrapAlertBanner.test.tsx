import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { TaxTrapAlertBanner, type TaxTrapAlertBannerProps } from "./TaxTrapAlertBanner";

const renderBanner = (props: TaxTrapAlertBannerProps) =>
  render(
    <MemoryRouter>
      <TaxTrapAlertBanner {...props} />
    </MemoryRouter>,
  );

// Advice boundary R2, R5, R8 and E31: facts only.
const BANNED = /escape|reclaim|save tax|saved|optimal|should|keep you below|restore/i;

describe("TaxTrapAlertBanner", () => {
  describe("alert band edges (£90,000 to £125,140 inclusive)", () => {
    it.each([
      [89_999, false],
      [90_000, true],
      [125_140, true],
      [125_141, false],
    ])("adjusted net income %d shows the alert: %s", (income, shown) => {
      renderBanner({ adjustedNetIncome: income });
      expect(screen.queryByRole("heading", { level: 3 }) !== null).toBe(shown);
    });

    it("stays hidden for a typical income", () => {
      const { container } = renderBanner({ adjustedNetIncome: 39_000 });
      expect(container.textContent).toBe("");
    });
  });

  it("inside the taper names both engine rates and the allowance reduction", () => {
    const { container } = renderBanner({ adjustedNetIncome: 115_000 });

    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Personal Allowance taper, £100,000 to £125,140",
    );
    expect(screen.getByText("62% marginal rate (unverified estimate)")).toBeDefined();
    expect(container.textContent).toContain("60% income tax, 62% including NI");
    expect(container.textContent).toContain("£115,000");
    expect(screen.getByText("£7,500")).toBeDefined(); // Personal Allowance reduced by
  });

  it("near the threshold states the 40% rate and does not claim 62%", () => {
    renderBanner({ adjustedNetIncome: 92_000 });
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Near the £100,000 Personal Allowance threshold",
    );
    expect(screen.getByText("40% marginal rate (unverified estimate)")).toBeDefined();
    expect(screen.queryByText(/62%/)).toBeNull();
  });

  it.each([92_000, 115_000, 125_140])("at %d it states facts only, with no action", (income) => {
    const { container } = renderBanner({ adjustedNetIncome: income });
    expect(container.textContent).not.toMatch(BANNED);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("uses Scottish rates when the region is Scotland, with no assumption label", () => {
    const { container } = renderBanner({ adjustedNetIncome: 110_000, region: "SCOTLAND" });

    expect(container.textContent).toContain("67.5% income tax, 69.5% including NI");
    expect(screen.queryByText(/assuming England, Wales and Northern Ireland/i)).toBeNull();
  });

  it("labels the England, Wales and NI assumption and links to set the region when unknown", () => {
    renderBanner({ adjustedNetIncome: 110_000 });

    // react-router's Link is mocked to its children in test/vitest.setup.ts.
    expect(screen.getByText(/assuming England, Wales and Northern Ireland/i).textContent).toContain(
      "Set your region",
    );
  });

  it("shows no assumption label when England, Wales and NI is the known region", () => {
    renderBanner({ adjustedNetIncome: 110_000, region: "ENGLAND_NI_WALES" });
    expect(screen.queryByText(/assuming England, Wales and Northern Ireland/i)).toBeNull();
  });
});
