import { DELTA_PANEL_COPY } from "@repo/ui";
import { expectPageRules } from "@repo/ui/testing";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomePayRise } from "./HomePayRise";

vi.mock("../../motion/useGsapMoment", () => ({ useGsapMoment: vi.fn() }));

const { persistOnboardingSeed, cta } = vi.hoisted(() => ({
  persistOnboardingSeed: vi.fn(),
  cta: { current: { href: "/contact#beta", label: "Request an invite", external: false } },
}));

vi.mock("@flump/finance-engine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flump/finance-engine")>()),
  persistOnboardingSeed,
}));

vi.mock("../../utils/site", () => ({ signupCta: () => cta.current }));

const tool = (
  <MemoryRouter>
    <HomePayRise />
  </MemoryRouter>
);

/** What a screen reader hears, and the digits drawn (hidden from it). */
const spoken = (id: string) => screen.getByTestId(id).firstElementChild?.textContent;
const drawn = (id: string) => screen.getByTestId(`${id}-drawn`).textContent;

/** Advances the fake clock in frame-sized steps, flushing React after each. */
function playFor(ms: number) {
  for (let t = 0; t < ms; t += 16) act(() => vi.advanceTimersByTime(16));
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
});

afterEach(() => {
  vi.useRealTimers();
  persistOnboardingSeed.mockClear();
  cta.current = { href: "/contact#beta", label: "Request an invite", external: false };
});

describe("HomePayRise: the sums and copy kept from PayRiseTeaser", () => {
  it("starts from £39,000 and a £2,000 rise: £1,440 kept, £400 tax, £160 NI, no taper note", () => {
    // Basic rate: 20% Income Tax (£400) and 8% NI (£160) on £2,000 leave £1,440.
    render(tool);
    expect(spoken("pay-rise-kept")).toBe("£1,440 a year");
    expect(spoken("pay-rise-income-tax")).toBe("£400");
    expect(spoken("pay-rise-national-insurance")).toBe("£160");
    expect(screen.queryByTestId("pay-rise-taper-note")).toBeNull();
  });

  it("explains the taper band once the visitor's own salary reaches it", () => {
    render(tool);
    fireEvent.change(screen.getByLabelText("Salary before tax"), { target: { value: "99500" } });
    expect(screen.getByTestId("pay-rise-taper-note").textContent).toMatch(
      /Personal Allowance reduces by £1 for every £2/,
    );
  });

  it("carries the one notice, led by the unverified estimate wording (ruling 3, R6)", () => {
    const { container } = render(tool);
    const notice = screen.getByRole("note");
    expect(notice.textContent?.startsWith(DELTA_PANEL_COPY.unverifiedBanner)).toBe(true);
    expect(screen.getByTestId("pay-rise-assumptions").textContent).toMatch(
      /^Uses \d{4} to \d{4} rates outside Scotland, with no pension or student loan\.$/,
    );
    expectPageRules(container, { projectionNotices: 1 });
  });

  it("invite-only: links to the Pay page, no invite link and nothing stored", () => {
    render(tool);
    expect(screen.getByRole("link", { name: "About pay in Flump" }).getAttribute("href")).toBe(
      "/features/pay",
    );
    expect(screen.queryByText(/Request an invite/)).toBeNull();
    expect(persistOnboardingSeed).not.toHaveBeenCalled();
  });

  it("open sign-up: stores only the visitor's own salary as the seed", () => {
    cta.current = { href: "https://app.example/signup", label: "Get started", external: true };
    render(tool);
    fireEvent.click(screen.getByRole("button", { name: "Start with this salary" }));
    expect(persistOnboardingSeed).toHaveBeenCalledWith(
      expect.objectContaining({ annualGrossSalary: 39_000 }),
    );
  });
});

describe("HomePayRise: the result glides on input only (MK13, MK10)", () => {
  it("has the final value in the server HTML, with nothing moving", () => {
    const html = renderToString(tool);
    expect(html).toContain("£1,440 a year");
    expect(html).not.toContain("data-moving");
  });

  it("never glides on load: the first value is drawn at once", () => {
    render(tool);
    expect(drawn("pay-rise-kept")).toBe("£1,440 a year");
    playFor(600);
    expect(drawn("pay-rise-kept")).toBe("£1,440 a year");
    expect(screen.getByTestId("pay-rise-kept").hasAttribute("data-moving")).toBe(false);
  });

  it("glides to the new value when the visitor moves a slider, saying only the final value", () => {
    render(tool);
    // A £1,000 rise at the basic rate keeps 72%: £720.
    fireEvent.change(screen.getByLabelText("Pay rise (a year)"), { target: { value: "1000" } });
    // A screen reader gets the final value at once; the drawn digits start from the old one.
    expect(spoken("pay-rise-kept")).toBe("£720 a year");
    expect(drawn("pay-rise-kept")).toBe("£1,440 a year");
    playFor(300);
    const midway = Number(drawn("pay-rise-kept")?.replace(/[£, a-z]/g, ""));
    expect(midway).toBeLessThan(1_440);
    expect(midway).toBeGreaterThan(720);
    expect(screen.getByTestId("pay-rise-kept").getAttribute("data-moving")).toBe("true");
    // durations.marketing.glide is 588 ms: settled exactly on the new value after it.
    playFor(400);
    expect(drawn("pay-rise-kept")).toBe("£720 a year");
    expect(drawn("pay-rise-income-tax")).toBe("£200");
    expect(screen.getByTestId("pay-rise-kept").hasAttribute("data-moving")).toBe(false);
  });

  it("changes at once with no movement under reduced motion", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      render(tool);
      fireEvent.change(screen.getByLabelText("Pay rise (a year)"), { target: { value: "1000" } });
      expect(drawn("pay-rise-kept")).toBe("£720 a year");
    } finally {
      window.matchMedia = original;
    }
  });
});
