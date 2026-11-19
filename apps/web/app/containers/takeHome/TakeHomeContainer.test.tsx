import { expectPageRules, findFigures } from "@repo/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
const profileState: { profile: Record<string, unknown> } = { profile: {} };
/** The shared profile store; null means it holds the same row as the loader. */
const storeState: { profile: Record<string, unknown> | null } = { profile: null };

const SAVED_PROFILE = {
  annualSalary: 45000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  pensionPercent: 5,
  isSalarySacrifice: false,
  studentLoanPlans: ["PLAN_2"],
};

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useLoaderData: () => ({ userProfile: profileState.profile }),
  useNavigate: () => navigate,
}));
vi.mock("~/hooks/useUserProfile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/hooks/useUserProfile")>()),
  useUserProfile: () => ({
    profile: storeState.profile ?? profileState.profile,
  }),
}));

import { DEFAULT_PROFILE } from "~/hooks/useUserProfile";
import TakeHomeContainer from "./TakeHomeContainer";

const PAY_PARTS = ["Income Tax", "National Insurance", "Pension", "Student loan"];

/** The scenario zone starts closed below the saved figures. */
const openZone = () =>
  fireEvent.click(screen.getByRole("button", { name: "Show what-if: change your pay" }));

describe("<TakeHomeContainer /> with saved figures", () => {
  beforeEach(() => {
    navigate.mockClear();
    profileState.profile = { ...SAVED_PROFILE };
    storeState.profile = null;
  });

  it("draws the full page on its first render, before the profile store is filled (P61)", () => {
    // The root profile is still DEFAULT_PROFILE; the page reads its own loader row, so the first
    // render already shows what the saved row gives and nothing changes size later: the strip of
    // three, with the pension and student loan card (5% pension and Plan 2).
    storeState.profile = DEFAULT_PROFILE as unknown as Record<string, unknown>;
    const { container } = render(<TakeHomeContainer />);
    expect(container.querySelectorAll("[data-kpi-value]")).toHaveLength(3);
    expect(screen.getByText("Pension and student loan")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Add your details" })).toBeNull();
  });

  // Slice 8: no browser baseline is read any more, so this proves the saved salary is used.
  it("uses the saved salary", () => {
    const { container } = render(<TakeHomeContainer />);
    // £45,000 saved is £3,750 a month before tax.
    expect(container.textContent).toContain("£3,750");
  });

  it("meets the page rules: figure budget, one hero, one notice, at most one primary button", () => {
    const { container } = render(<TakeHomeContainer />);
    // The scenario zone starts closed, so its one notice is behind the disclosure.
    expectPageRules(container, { maxFigures: 9, maxNotSet: 0, projectionNotices: 0 });
    openZone();
    expectPageRules(container, { maxFigures: 9, maxNotSet: 0, projectionNotices: 1 });
    // A strip of three, never one (RESCORE take-home).
    expect(container.querySelectorAll("[data-kpi-value]")).toHaveLength(3);
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Take-home pay" })).toBeDefined();
  });

  it("shows no pence on any figure", () => {
    const { container } = render(<TakeHomeContainer />);
    const money = findFigures(container).filter((f) => f.kind === "money");
    expect(money.length).toBeGreaterThan(0);
    for (const f of money) expect(f.text).not.toMatch(/\.\d{2}\b/);
    expect(container.textContent).not.toMatch(/£[\d,]+\.\d{2}\b/);
  });

  it("names each pay part once, in the table behind Show details, and the estimate once up front", () => {
    const { container } = render(<TakeHomeContainer />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/You take home/);
    // The table repeats the strip, so it waits behind the disclosure.
    expect(screen.queryByRole("table", { name: "Where your pay goes each month" })).toBeNull();
    let card: HTMLElement | null = screen.getByText("Monthly take-home pay");
    while (card && !/£/.test(card.textContent ?? "")) card = card.parentElement;
    const amount = /£[\d,]+/.exec(card?.textContent ?? "")?.[0];
    expect(amount).toBeDefined();
    expect(findFigures(container).filter((f) => f.text === amount)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    const table = screen.getByRole("table", { name: "Where your pay goes each month" });
    const counts = PAY_PARTS.map((label) => [
      label,
      within(table).getAllByText(new RegExp(`^${label}$`)).length,
    ]);
    expect(counts).toEqual(PAY_PARTS.map((label) => [label, 1]));
  });

  it("the hero is the take-home estimate, labelled Unverified estimate inside the hero", () => {
    const { container } = render(<TakeHomeContainer />);
    const hero = container.querySelector('[data-tone="hero"]');
    expect(hero?.textContent).toContain("Monthly take-home pay");
    expect(hero?.textContent).not.toContain("Salary before tax");
    expect(hero?.textContent).not.toContain("£45,000");
    expect(hero?.querySelector("[data-estimate-label]")?.textContent).toBe("Unverified estimate");
    expect(screen.getByText("Monthly pay before tax")).toBeDefined();
  });

  it("keeps the saved breakdown outside the scenario zone, which holds only the two what-ifs", () => {
    render(<TakeHomeContainer />);
    openZone();
    const zone = screen.getByTestId("scenario-zone");
    const breakdown = screen.getByTestId("take-home-breakdown");
    expect(zone.contains(breakdown)).toBe(false);
    expect(zone.contains(screen.getByTestId("hero-figure"))).toBe(false);
    expect(
      within(zone)
        .getAllByRole("tab")
        .map((t) => t.textContent),
    ).toEqual(["A pay rise", "The next £1,000"]);
    // The one notice sits in the zone and carries the "Unverified estimate" sentence.
    const notice = within(zone).getByRole("note");
    expect(notice.textContent).toMatch(/^Unverified estimate\./);
  });

  it("has no weekly or daily strip, no £100,000 line and no bottom disclaimer", () => {
    const { container } = render(<TakeHomeContainer />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Weekly|Daily|Where you stand|100,000|for guidance only/);
    expect(text).not.toMatch(/gross|Qualifying/i);
  });

  it("puts the share not taken home and pay after pension under Show details", () => {
    render(<TakeHomeContainer />);
    expect(screen.queryByText("Pay after pension, before tax")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(screen.getByText("Pay after pension, before tax")).toBeDefined();
    expect(screen.getByText("Share of pay not taken home")).toBeDefined();
  });

  it("sends 'Model this in savings' to the forecaster with the monthly change, by router state", () => {
    render(<TakeHomeContainer />);
    openZone();
    fireEvent.click(screen.getByRole("button", { name: "Model this in savings" }));
    expect(navigate).toHaveBeenCalledTimes(1);
    const [to, opts] = navigate.mock.calls[0];
    expect(to).toBe("/app/savings#forecast");
    expect(opts.state.payRise).toBeGreaterThan(0);
  });
});

describe("<TakeHomeContainer /> without a saved salary", () => {
  beforeEach(() => {
    profileState.profile = { ...SAVED_PROFILE, annualSalary: null };
  });

  // Slice 8: there is no browser baseline to fall back to; with no saved salary the page asks for it.
  it("never falls back to a browser salary when none is saved", () => {
    const { container } = render(<TakeHomeContainer />);
    expect(screen.getByText(/Add your salary before tax/)).toBeDefined();
    expect(container.textContent).not.toContain("£2,500");
  });

  it("shows one setup prompt with one button, and no £0 figures, tabs or zone", () => {
    const { container } = render(<TakeHomeContainer />);
    expectPageRules(container, { maxFigures: 0, projectionNotices: 0 });
    expect(screen.getByText(/Add your salary before tax/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Add salary" }).getAttribute("href")).toBe(
      "/app/profile#settings-age-and-pay",
    );
    expect(screen.queryByTestId("scenario-zone")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(container.textContent).not.toContain("£0");
  });

  it("shows the setup prompt, never £0, when a saved profile has no salary", () => {
    // A profile row exists (it has an id) but no salary is saved: an unknown salary is not shown
    // as £0 (slice 8: no browser baseline is read).
    profileState.profile = { ...SAVED_PROFILE, id: "profile-1", annualSalary: null };
    const { container } = render(<TakeHomeContainer />);
    expect(screen.getByText(/Add your salary before tax/)).toBeDefined();
    expect(container.textContent).not.toContain("£2,500");
    expect(container.textContent).not.toContain("£0");
  });
});
