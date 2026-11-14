import { DELTA_PANEL_COPY } from "@repo/ui";
import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isKnownToolSlug } from "../../utils/toolSlugs";
import {
  DEFAULT_SALARY_GBP,
  PAY_RISE_TOOL_PATH,
  PayRiseTeaser,
  payRiseResult,
  taxYearInWords,
} from "./PayRiseTeaser";

const renderTeaser = () =>
  render(
    <MemoryRouter>
      <PayRiseTeaser />
    </MemoryRouter>,
  );

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

const { persistOnboardingSeed, cta } = vi.hoisted(() => ({
  persistOnboardingSeed: vi.fn(),
  cta: { current: { href: "/contact#beta", label: "Request an invite", external: false } },
}));

vi.mock("@flump/finance-engine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flump/finance-engine")>()),
  persistOnboardingSeed,
}));

vi.mock("../../utils/site", () => ({ signupCta: () => cta.current }));

describe("PayRiseTeaser", () => {
  afterEach(() => {
    persistOnboardingSeed.mockClear();
    cta.current = { href: "/contact#beta", label: "Request an invite", external: false };
  });

  it("starts from a typical salary, not the £100k band, and shows no taper note", () => {
    renderTeaser();
    expect(DEFAULT_SALARY_GBP).toBe(39_000);
    const outcome = screen.getByTestId("pay-rise-outcome");
    expect(within(outcome).getByText("£1,440 a year")).toBeDefined();
    expect(screen.queryByTestId("pay-rise-taper-note")).toBeNull();
  });

  it("updates the estimate when the rise changes and explains the taper if reached", () => {
    renderTeaser();
    fireEvent.change(screen.getByLabelText("Pay rise (a year) range slider"), {
      target: { value: "1000" },
    });
    expect(screen.getByText("£720 a year")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Current salary (before tax) range slider"), {
      target: { value: "99500" },
    });
    expect(screen.getByTestId("pay-rise-taper-note").textContent).toMatch(
      /Personal Allowance reduces by £1 for every £2/,
    );
  });

  it("carries the one notice, led by the unverified estimate wording (ruling 3, R6)", () => {
    const { container } = renderTeaser();
    const notice = screen.getByRole("note");
    expect(notice.textContent?.startsWith(DELTA_PANEL_COPY.unverifiedBanner)).toBe(true);
    // The assumptions are always visible, with the tax year in words.
    expect(screen.getByTestId("pay-rise-assumptions").textContent).toMatch(
      /^Uses the \d{4} to \d{4} tax year and the bands for England, Wales and Northern Ireland/,
    );
    expect(screen.queryByRole("button", { name: "More" })).toBeNull();
    expect(taxYearInWords("2026/27")).toBe("2026 to 2027");
    expectPageRules(container, { projectionNotices: 1 });
  });

  it("invite-only: links to the full calculator, no invite button and nothing stored", () => {
    renderTeaser();
    const link = screen.getByRole("link", { name: "Open the full calculator" });
    expect(link.getAttribute("href")).toBe(PAY_RISE_TOOL_PATH);
    expect(isKnownToolSlug(PAY_RISE_TOOL_PATH.replace("/tools/", ""))).toBe(true);
    expect(screen.queryByText(/Request an invite/)).toBeNull();
    expect(persistOnboardingSeed).not.toHaveBeenCalled();
  });

  it("open sign-up: stores only the visitor's own salary as the seed", () => {
    cta.current = { href: "https://app.example/signup", label: "Get started", external: true };
    renderTeaser();
    fireEvent.click(screen.getByRole("button", { name: "Start with this salary" }));
    expect(persistOnboardingSeed).toHaveBeenCalledWith(
      expect.objectContaining({ annualGrossSalary: DEFAULT_SALARY_GBP }),
    );
  });
});
