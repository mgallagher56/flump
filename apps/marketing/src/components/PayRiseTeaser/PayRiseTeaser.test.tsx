import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SALARY_GBP, PayRiseTeaser, payRiseResult } from "./PayRiseTeaser";

describe("payRiseResult", () => {
  it("keeps 72% of a rise inside the basic rate band (20% tax, 8% NI)", () => {
    const r = payRiseResult(39_000, 2_000);
    expect(r.keptAnnual).toBeCloseTo(1_440, 0);
    expect(r.extraIncomeTax).toBeCloseTo(400, 0);
    expect(r.extraNationalInsurance).toBeCloseTo(160, 0);
    expect(r.keptPct).toBeCloseTo(72, 0);
    expect(r.entersTaperBand).toBe(false);
  });

  it("flags the taper band only when the visitor's own figures reach it", () => {
    expect(payRiseResult(99_000, 2_000).entersTaperBand).toBe(true);
    expect(payRiseResult(130_000, 2_000).entersTaperBand).toBe(false);
    expect(payRiseResult(60_000, 5_000).entersTaperBand).toBe(false);
  });
});

describe("PayRiseTeaser", () => {
  it("starts from a typical salary, not the £100k band, and shows no taper note", () => {
    render(<PayRiseTeaser />);
    expect(DEFAULT_SALARY_GBP).toBe(39_000);
    expect(screen.getByText("UK take-home")).toBeDefined();
    const outcome = screen.getByTestId("pay-rise-outcome");
    expect(within(outcome).getByText("£1,440 a year of £2,000")).toBeDefined();
    expect(screen.queryByText("Personal Allowance taper")).toBeNull();
  });

  it("updates the estimate when the rise changes and explains the taper if reached", () => {
    render(<PayRiseTeaser />);
    fireEvent.change(screen.getByLabelText("Pay rise (a year) range slider"), {
      target: { value: "1000" },
    });
    expect(screen.getByText("£720 a year of £1,000")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Current salary (before tax) range slider"), {
      target: { value: "99500" },
    });
    expect(screen.getByText("Personal Allowance taper")).toBeDefined();
  });

  it("labels the figures as an unverified example (R6)", () => {
    render(<PayRiseTeaser />);
    expect(screen.getByText(/Unverified example for the/)).toBeDefined();
  });
});

const { persistOnboardingSeed, cta } = vi.hoisted(() => ({
  persistOnboardingSeed: vi.fn(),
  cta: { current: { href: "/contact#beta", label: "Request an invite", external: false } },
}));

vi.mock("@flump/finance-engine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flump/finance-engine")>()),
  persistOnboardingSeed,
}));

vi.mock("../../utils/site", () => ({ signupCta: () => cta.current }));

describe("PayRiseTeaser save button", () => {
  afterEach(() => {
    persistOnboardingSeed.mockClear();
  });

  it("invite-only: shows the invite label and stores nothing", () => {
    cta.current = { href: "/contact#beta", label: "Request an invite", external: false };
    render(<PayRiseTeaser />);
    fireEvent.click(screen.getByRole("button", { name: /Request an invite/ }));
    expect(persistOnboardingSeed).not.toHaveBeenCalled();
  });

  it("open sign-up: stores only the visitor's own salary as the seed", () => {
    cta.current = { href: "https://app.example/signup", label: "Get started", external: true };
    render(<PayRiseTeaser />);
    fireEvent.click(screen.getByRole("button", { name: /Save this salary baseline/ }));
    expect(persistOnboardingSeed).toHaveBeenCalledWith(
      expect.objectContaining({ annualGrossSalary: DEFAULT_SALARY_GBP }),
    );
  });
});
